import { Router } from "express";
import { validate } from "../../../middleware/validate.middleware";
import { recommendFromChat } from "./chat.controller";
import { recommendSchema } from "./chat.schemas";

const router = Router();

router.post(
  "/recommend",
  validate({ body: recommendSchema }),
  recommendFromChat
);

export default router;
