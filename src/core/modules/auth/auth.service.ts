import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../../db";

export async function createUser(email: string, password: string, username?: string) {
  const saltRounds = 10;

  const passwordHash = await bcrypt.hash(password, saltRounds);

  const query = `
    INSERT INTO users (email, username, password_hash)
    VALUES ($1, $2, $3)
    RETURNING id, email, username, created_at
  `;

  const values = [email, username ?? null, passwordHash];

  const result = await pool.query(query, values);

  return result.rows[0];
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
