import { z } from "zod";

export const recommendSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "text is required")
    .max(500, "text is too long (max 500 characters)"),
});

export type RecommendInput = z.infer<typeof recommendSchema>;
