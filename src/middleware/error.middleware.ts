/**
 * Centralised error handler.
 *
 * Mounted at the very end of the middleware chain. Anything thrown or
 * passed to next(err) inside any route handler ends up here and gets
 * turned into a consistent JSON response.
 *
 * Express 5 forwards async errors to this automatically, so route
 * handlers can just `throw new ApiError(...)` without try/catch.
 */

import { ErrorRequestHandler, RequestHandler } from "express";
import { ApiError, NotFoundError } from "../core/errors";

export const errorMiddleware: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    res.status(err.status).json({
      error: err.message,
      code: err.code,
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
    return;
  }

  // Unknown / unexpected error. Log it server-side, return generic 500.
  // Don't leak stack traces or internal messages to the client.
  console.error("UNHANDLED ERROR:", err);

  res.status(500).json({
    error: "Internal server error",
    code: "INTERNAL_ERROR",
  });
};

/**
 * 404 fallback for routes that didn't match. Mount just before the
 * error middleware so every unmatched request produces a JSON 404
 * instead of Express's default HTML page.
 */
export const notFoundMiddleware: RequestHandler = (req, _res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.path} not found`));
};
