import { Request, Response } from "express";
import { getProfileByUserId } from "./profile.service";

export async function getProfile(req: Request, res: Response) {
  try {
    const userId = req.userId!;

    const profile = await getProfileByUserId(userId);

    if (!profile) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({
      id: profile.id,
      email: profile.email,
      username: profile.username
    });

  } catch (err) {
    console.error("PROFILE ERROR:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}