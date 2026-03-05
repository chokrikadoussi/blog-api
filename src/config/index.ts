import type { StringValue } from "ms";

export const config = {
  jwtSecret: (process.env.JWT_SECRET || "your_jwt_secret") as StringValue,
  jwtExpiresIn: (process.env.JWT_EXPIRES_IN || "7d") as StringValue,
};
