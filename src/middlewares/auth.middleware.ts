import type { Request, Response, NextFunction } from "express";
import type { Role } from "../generated/prisma/enums.js";
import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import { ForbiddenError, UnauthorizedError } from "../utils/errors.js";

const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("Invalid authorization header");
  }

  const token = authHeader.split(" ")[1] || "";

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded as { id: number; role: Role };
    next();
  } catch (error) {
    next(error);
  }
};

const authenticateOptional = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = authHeader.split(" ")[1] || "";

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded as { id: number; role: Role };
  } catch (_error) {
    // Ignore token errors for optional authentication
  } finally {
    next();
  }
};

const authorize = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError("User not authenticated");
    }

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError("Forbidden");
    }

    next();
  };
};

export { authenticate, authenticateOptional, authorize };
