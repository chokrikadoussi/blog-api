import type { StringValue } from "ms";

export const config = {
  jwtSecret: (process.env.JWT_SECRET || "your_jwt_secret") as StringValue,
  jwtExpiresIn: (process.env.JWT_EXPIRES_IN || "7d") as StringValue,
  databaseUrl:
    process.env.NODE_ENV === "test" ? process.env.DATABASE_URL_TEST : process.env.DATABASE_URL,
};
