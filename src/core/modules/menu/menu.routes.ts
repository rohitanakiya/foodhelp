import { Router } from "express";
import { getMenu } from "./menu.controller";

const router = Router();

router.get("/", getMenu);

export default router;
