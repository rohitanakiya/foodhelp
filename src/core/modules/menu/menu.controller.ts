import { Request, Response } from "express";
import { getMenuItems } from "./menu.service";
import type { MenuQuery } from "./menu.schemas";

export async function getMenu(
  req: Request<unknown, unknown, unknown, MenuQuery>,
  res: Response
) {
  const items = await getMenuItems(req.query);
  res.status(200).json(items);
}
