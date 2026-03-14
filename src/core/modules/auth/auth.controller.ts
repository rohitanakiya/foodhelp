import { Request, Response } from "express";
import { createUser } from "./auth.service";

export async function signup(req: Request, res: Response) {
  try {
    const { email, password, username } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const user = await createUser(email, password, username);

    return res.status(201).json({
      message: "User created",
      user
    });

  } catch (error: any) {

    if (error.code === "23505") {
      return res.status(409).json({ error: "Email or username already exists" });
    }

    return res.status(500).json({ error: "Internal server error" });
  }
}