import { Request, Response } from "express";
import { getProfileByUserId } from "./profile.service";

export async function getProfile(req: Request, res: Response) {
  try {
    const { userId } = req;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const profile = await getProfileByUserId(userId);

    if (!profile) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json(profile);
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
}
