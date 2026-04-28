/**
 * Tiny client for the api-rate-limiter's admin endpoints.
 *
 * Used at signup time to provision an API key for the new user. The
 * key_id is stored in the users table; the raw key is returned to the
 * caller exactly once and never persisted.
 *
 * Configuration:
 *   RATE_LIMITER_URL        e.g. http://127.0.0.1:8000
 *   RATE_LIMITER_ADMIN_KEY  the X-Admin-Key value from the rate-limiter
 *
 * If RATE_LIMITER_URL is not set, isRateLimiterEnabled() returns false
 * and signup falls back to creating a user without provisioning a key.
 * This keeps standalone dev (no gateway) working.
 */

const DEFAULT_TIER = "free";

export interface CreateKeyInput {
  /** Human-readable label, shown in admin lists. */
  name: string;
  /** Allowed scopes — must be a subset of what the user is allowed. */
  scopes?: ("read" | "write" | "admin")[];
  /** Tier controls rate-limit budget. Free is the safe default. */
  tier?: "free" | "pro" | "enterprise";
}

export interface CreateKeyResult {
  keyId: string;
  /** The raw key, e.g. "rl_abc123...". Show it to the user ONCE. */
  rawKey: string;
  name: string;
  tier: string;
  scopes: string[];
}

export class RateLimiterError extends Error {
  constructor(message: string, public status?: number, public body?: unknown) {
    super(message);
    this.name = "RateLimiterError";
  }
}

export function isRateLimiterEnabled(): boolean {
  return Boolean(process.env.RATE_LIMITER_URL);
}

function getConfig(): { baseUrl: string; adminKey: string } {
  const baseUrl = process.env.RATE_LIMITER_URL;
  const adminKey = process.env.RATE_LIMITER_ADMIN_KEY;

  if (!baseUrl) {
    throw new RateLimiterError("RATE_LIMITER_URL is not set");
  }
  if (!adminKey) {
    throw new RateLimiterError("RATE_LIMITER_ADMIN_KEY is not set");
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ""), adminKey };
}

export async function createApiKey(input: CreateKeyInput): Promise<CreateKeyResult> {
  const { baseUrl, adminKey } = getConfig();

  const body = {
    name: input.name,
    scopes: input.scopes ?? ["read"],
    tier: input.tier ?? DEFAULT_TIER,
  };

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/admin/keys`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": adminKey,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new RateLimiterError(
      `Could not reach rate-limiter at ${baseUrl}: ${(err as Error).message}`
    );
  }

  if (!response.ok) {
    let parsed: unknown;
    try {
      parsed = await response.json();
    } catch {
      parsed = await response.text();
    }
    throw new RateLimiterError(
      `Rate-limiter returned ${response.status}`,
      response.status,
      parsed
    );
  }

  const data = (await response.json()) as {
    key_id: string;
    raw_key: string;
    name: string;
    tier: string;
    scopes: string[];
  };

  return {
    keyId: data.key_id,
    rawKey: data.raw_key,
    name: data.name,
    tier: data.tier,
    scopes: data.scopes,
  };
}
