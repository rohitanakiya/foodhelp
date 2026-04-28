import { Router } from "express";
import {authMiddleware} from "../../../middleware/auth.middleware";
import { getProfile } from "./profile.controller";

const router = Router();

// apply auth middleware to all routes
router.use(authMiddleware);

router.get("/me", getProfile);

export default router;