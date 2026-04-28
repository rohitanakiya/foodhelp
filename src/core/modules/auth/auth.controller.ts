import { Request, Response } from "express";
import {
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
} from "../../errors";
import { authenticateUser, createUser } from "./auth.service";
import type { LoginInput, SignupInput } from "./auth.schemas";

export async function signup(
  req: Request<unknown, unknown, SignupInput>,
  res: Response
) {
  const { email, password, username } = req.body;

  let result;
  try {
    result = await createUser(email, password, username);
  } catch (error: unknown) {
    // Postgres unique_violation
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "23505"
    ) {
      throw new ConflictError("Email or username already exists");
    }
    throw error;
  }

  res.status(201).json({
    message: "User created",
    ...result,
  });
}

export async function login(
  req: Request<unknown, unknown, LoginInput>,
  res: Response
) {
  const { email, password } = req.body;

  let authResult;
  try {
    authResult = await authenticateUser(email, password);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "USER_INACTIVE") {
      throw new ForbiddenError("User account is inactive");
    }
    throw error;
  }

  if (!authResult) {
    throw new UnauthorizedError("Invalid email or password");
  }

  res.status(200).json({ message: "Login successful", ...authResult });
}
