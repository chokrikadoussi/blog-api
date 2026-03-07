import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/errors.js";
import { Prisma } from "../generated/prisma/client.js";

const errorHandler = (err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002":
        res.status(409).json({ error: "Unique constraint failed" });
        break;
      case "P2025":
        res.status(404).json({ error: "Record not found" });
        break;
      default:
        res.status(500).json({ error: "Database error" });
        break;
    }
    return;
  }

  console.error("Error:", err);
  res.status(500).json({ error: "Internal server error" });
};

export default errorHandler;
