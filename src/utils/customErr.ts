// src/utils/customErr.ts
export class CustomError extends Error {
  public readonly statusCode: number;
  public readonly isOperational = true;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "CustomError";
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}