import { Request, Response } from "express";
import { authenticateUser, createUser } from "./auth.service";

export async function signup(req: Request, res: Response) {
  try {
    const { email, password, username } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const user = await createUser(email, password, username);

    return res.status(201).json({
      message: "User created",
      user,
    });
  } catch (error: any) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "Email or username already exists" });
    }

    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const authResult = await authenticateUser(email, password);

    if (!authResult) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    return res.status(200).json({
      message: "Login successful",
      ...authResult,
    });
  } catch (error: any) {
    if (error.message === "USER_INACTIVE") {
      return res.status(403).json({ error: "User account is inactive" });
    }

    return res.status(500).json({ error: "Internal server error" });
  }
}
