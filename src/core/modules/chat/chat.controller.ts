import { Request, Response } from "express";
import { getRecommendationsFromText } from "./chat.service";

export async function recommendFromChat(req: Request, res: Response) {
  try {
    const { text } = req.body;

    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "text is required" });
    }

    const result = await getRecommendationsFromText(text);
    return res.status(200).json(result);
  } catch (err) {
    console.error("CHAT RECOMMEND ERROR:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
