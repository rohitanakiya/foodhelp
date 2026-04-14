import { Router } from "express";
import { recommendFromChat } from "./chat.controller";

const router = Router();

router.post("/recommend", recommendFromChat);

export default router;
