import jwt from "jsonwebtoken";
import type { Role } from "../../src/generated/prisma/enums.js";
import { config } from "../../src/config/index.js";

export const generateToken = (userId: number, role: Role): string => {
  return jwt.sign({ id: userId, role }, config.jwtSecret, { expiresIn: "1h" });
};
