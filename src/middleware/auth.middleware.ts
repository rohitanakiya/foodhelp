import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

interface AuthTokenPayload extends JwtPayload {
  userId?: string;
  sub?: string;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.header("Authorization");

  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    return res.status(500).json({ error: "JWT secret is not configured" });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as AuthTokenPayload;
    const userId = decoded.userId ?? decoded.sub;

    if (!userId || typeof userId !== "string") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    req.userId = userId;
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

export default authMiddleware;
