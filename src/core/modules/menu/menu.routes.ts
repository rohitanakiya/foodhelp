import { Router } from "express";
import { validate } from "../../../middleware/validate.middleware";
import { getMenu } from "./menu.controller";
import { menuQuerySchema } from "./menu.schemas";

const router = Router();

router.get("/", validate({ query: menuQuerySchema }), getMenu);

export default router;
