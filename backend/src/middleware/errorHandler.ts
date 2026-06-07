import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

export class HttpError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: unknown
  ) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function notFoundHandler(
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  res.status(404).json({
    error: "NOT_FOUND",
    message: "Route not found",
    statusCode: 404,
  } satisfies ApiError);
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  console.error("[error]", err);

  if (err instanceof ZodError) {
    res.status(400).json({
      error: "VALIDATION_ERROR",
      message: err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      statusCode: 400,
    } satisfies ApiError);
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      statusCode: err.statusCode,
    } satisfies ApiError);
    return;
  }

  if (err instanceof Error) {
    res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong. Please try again.",
      statusCode: 500,
    } satisfies ApiError);
    return;
  }

  res.status(500).json({
    error: "INTERNAL_SERVER_ERROR",
    message: "Unknown error",
    statusCode: 500,
  } satisfies ApiError);
}
