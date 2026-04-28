/**
 * Gateway-auth middleware.
 *
 * When the food-backend runs behind the api-rate-limiter as a gateway,
 * requests arrive carrying identity headers set by the gateway:
 *
 *   X-Authenticated-Key-Id    — opaque key UUID
 *   X-Authenticated-Key-Name  — human label given when the key was created
 *   X-Authenticated-Scopes    — comma-separated, e.g. "read,write"
 *   X-Authenticated-Tier      — "free" | "pro" | "enterprise"
 *
 * This middleware reads those headers and populates req.gateway with a
 * structured object. It does NOT short-circuit the JWT auth used by
 * /profile and friends — those endpoints continue to require a Bearer
 * token. Layered auth: the gateway answers "may you call this API at
 * all?", JWT answers "and who are you as a user?".
 *
 * SECURITY: We only trust these headers when GATEWAY_MODE=true is set
 * in .env. Otherwise anyone could send these headers directly to
 * impersonate a key. The deployment expectation is that the food-backend
 * binds to 127.0.0.1 in gateway mode so only the local gateway can
 * reach it.
 */

import { NextFunction, Request, Response } from "express";

declare global {
  namespace Express {
    interface Request {
      gateway?: GatewayIdentity;
    }
  }
}

export interface GatewayIdentity {
  keyId: string;
  keyName: string | null;
  scopes: string[];
  tier: string | null;
}

function readHeader(req: Request, name: string): string | null {
  const value = req.header(name);
  if (typeof value !== "string" || value.length === 0) return null;
  return value;
}

export function gatewayAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  if (process.env.GATEWAY_MODE !== "true") {
    return next();
  }

  const keyId = readHeader(req, "X-Authenticated-Key-Id");
  if (!keyId) {
    // Not a gateway-forwarded request. Let it through; downstream
    // middleware (e.g. JWT auth on /profile) will reject if needed.
    return next();
  }

  const scopesRaw = readHeader(req, "X-Authenticated-Scopes") ?? "";
  const scopes = scopesRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  req.gateway = {
    keyId,
    keyName: readHeader(req, "X-Authenticated-Key-Name"),
    scopes,
    tier: readHeader(req, "X-Authenticated-Tier"),
  };

  next();
}

export default gatewayAuthMiddleware;
