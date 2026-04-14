import { Router } from "express";
import authMiddleware from "../../../middleware/auth.middleware";
import { getProfile } from "./profile.controller";

const router = Router();

router.get("/", authMiddleware, getProfile);

export default router;
