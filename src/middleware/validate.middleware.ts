/**
 * Generic Zod request validation middleware.
 *
 * Usage:
 *   const schema = { body: z.object({ email: z.string().email() }) };
 *   router.post("/login", validate(schema), loginController);
 *
 * On success, the parsed/coerced data is written back onto req so
 * downstream handlers see the validated shape.
 *
 * On failure, throws a ValidationError which the error middleware
 * turns into a 400 with field-by-field details.
 */

import { RequestHandler } from "express";
import { ZodError, ZodSchema } from "zod";
import { ValidationError } from "../core/errors";

type Source = "body" | "params" | "query";

type ValidationSchemas = Partial<Record<Source, ZodSchema>>;

function formatZodIssues(err: ZodError) {
  return err.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
    code: issue.code,
  }));
}

export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req, _res, next) => {
    try {
      for (const source of ["body", "params", "query"] as const) {
        const schema = schemas[source];
        if (!schema) continue;

        const result = schema.safeParse(req[source]);
        if (!result.success) {
          throw new ValidationError(
            `Invalid ${source}`,
            formatZodIssues(result.error)
          );
        }

        // Express 5 makes req.query a getter-only property in some
        // configurations. Use defineProperty to overwrite cleanly.
        Object.defineProperty(req, source, {
          value: result.data,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
