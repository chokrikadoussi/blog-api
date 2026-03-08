import type { StringValue } from "ms";

if (process.env.NODE_ENV === "production") {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be defined and at least 32 characters in production");
  }
}

export const config = {
  jwtSecret: (process.env.JWT_SECRET ||
    "FHwoVMqj4FCs6zC1ALMbtr76k4HShMpn9ScpiWVBIKW") as StringValue,
  jwtExpiresIn: (process.env.JWT_EXPIRES_IN || "7d") as StringValue,
  databaseUrl:
    process.env.NODE_ENV === "test" ? process.env.DATABASE_URL_TEST : process.env.DATABASE_URL,
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
};
