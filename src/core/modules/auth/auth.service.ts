import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../../db";
import {
  createApiKey,
  isRateLimiterEnabled,
  RateLimiterError,
} from "../../rate-limiter-client";

export interface SignupResult {
  user: {
    id: string;
    email: string;
    username: string | null;
    createdAt: Date;
  };
  /**
   * Present only when the rate-limiter is configured and provisioning
   * succeeded. The caller must show this to the user once and never
   * persist it on the food-backend side.
   */
  apiKey?: {
    rawKey: string;
    keyId: string;
    note: string;
  };
}

export async function createUser(
  email: string,
  password: string,
  username?: string
): Promise<SignupResult> {
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Step 1: Insert the user row first. If the rate-limiter is down or
  // returns an error later, we still have a usable account; we just
  // didn't provision an API key, and the user can request one later.
  const userResult = await pool.query<{
    id: string;
    email: string;
    username: string | null;
    created_at: Date;
  }>(
    `
    INSERT INTO users (email, username, password_hash)
    VALUES ($1, $2, $3)
    RETURNING id, email, username, created_at
    `,
    [email, username ?? null, passwordHash]
  );
  const user = userResult.rows[0];

  // Step 2: If the gateway is configured, provision an API key for this
  // user and stash the key_id on the row. Failures here are logged but
  // not fatal — the user is created either way.
  let apiKey: SignupResult["apiKey"];

  if (isRateLimiterEnabled()) {
    try {
      const created = await createApiKey({
        name: `user:${user.email}`,
        scopes: ["read", "write"],
        tier: "free",
      });

      await pool.query(`UPDATE users SET api_key_id = $1 WHERE id = $2`, [
        created.keyId,
        user.id,
      ]);

      apiKey = {
        rawKey: created.rawKey,
        keyId: created.keyId,
        note: "Store this key safely. It will never be shown again.",
      };
    } catch (err) {
      const message =
        err instanceof RateLimiterError
          ? err.message
          : (err as Error).message;
      console.warn(
        `Signup succeeded for ${user.email} but API key provisioning failed: ${message}`
      );
    }
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      createdAt: user.created_at,
    },
    apiKey,
  };
}

export async function authenticateUser(email: string, password: string) {
  const query = `
    SELECT id, email, username, password_hash, is_active, created_at
    FROM users
    WHERE email = $1
  `;

  const result = await pool.query(query, [email]);
  const user = result.rows[0];

  if (!user) {
    return null;
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatches) {
    return null;
  }

  if (!user.is_active) {
    throw new Error("USER_INACTIVE");
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not configured");
  }

  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
    },
    jwtSecret,
    { expiresIn: "7d" }
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      isActive: user.is_active,
      createdAt: user.created_at,
    },
  };
}
