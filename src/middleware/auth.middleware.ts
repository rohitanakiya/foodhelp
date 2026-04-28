import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.header("Authorization");

  if (!authHeader) {
    return res.status(401).json({ error: "Authorization header missing" });
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Invalid authorization format" });
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    return res.status(500).json({ error: "JWT secret not configured" });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);

    if (typeof decoded === "string" || !("userId" in decoded)) {
      return res.status(401).json({ error: "Invalid token payload" });
    }

    req.userId = (decoded as any).userId;

    next();
  } catch (err) {
    console.error("JWT ERROR:", err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}