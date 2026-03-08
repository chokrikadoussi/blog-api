import rateLimit from "express-rate-limit";

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: "Trop de requêtes, réessayez dans 15 minutes" },
});

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

export { globalLimiter, authLimiter };
