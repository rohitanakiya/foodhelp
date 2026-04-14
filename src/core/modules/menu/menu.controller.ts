import { Request, Response } from "express";
import { getMenuItems } from "./menu.service";

function parseBooleanQuery(value: unknown): boolean | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue === "true") {
    return true;
  }

  if (normalizedValue === "false") {
    return false;
  }

  return null;
}

function parseNumberQuery(value: unknown): number | null {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return parsed;
}

export async function getMenu(req: Request, res: Response) {
  try {
    const { city, veg, minProtein, maxPrice } = req.query;

    if (city !== undefined && typeof city !== "string") {
      return res.status(400).json({ error: "city must be a string" });
    }

    if (veg !== undefined && parseBooleanQuery(veg) === null) {
      return res.status(400).json({ error: "veg must be true or false" });
    }

    if (minProtein !== undefined && parseNumberQuery(minProtein) === null) {
      return res.status(400).json({ error: "minProtein must be a number" });
    }

    if (maxPrice !== undefined && parseNumberQuery(maxPrice) === null) {
      return res.status(400).json({ error: "maxPrice must be a number" });
    }

    const items = await getMenuItems({
      city: typeof city === "string" ? city : undefined,
      veg: veg !== undefined ? parseBooleanQuery(veg) ?? undefined : undefined,
      minProtein: minProtein !== undefined ? parseNumberQuery(minProtein) ?? undefined : undefined,
      maxPrice: maxPrice !== undefined ? parseNumberQuery(maxPrice) ?? undefined : undefined,
    });

    return res.status(200).json(items);
  } catch (err) {
    console.error("MENU ERROR:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
