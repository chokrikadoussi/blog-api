import express from "express";
import { prisma } from "./lib/prisma.js";
import authRouter from "./routes/auth.route.js";
import articleRouter from "./routes/articles.route.js";
import commentsRouter from "./routes/comments.route.js";
import tagsRouter from "./routes/tags.route.js";
import errorHandler from "./middlewares/error.middleware.js";
import helmet from "helmet";
import { globalLimiter, authLimiter } from "./middlewares/rateLimiter.middleware.js";
import cors from "cors";
import { config } from "./config/index.js";
import swaggerUi from "swagger-ui-express";
import openApiSpec from "./docs/openapi.js";
const app = express();

app.use(express.json());
app.use(helmet());
app.use(globalLimiter);
app.use(
  cors({
    origin: config.corsOrigin,
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      version: "1.0.0",
      uptime: Math.round(process.uptime()),
      db: "connected",
      env: process.env.NODE_ENV ?? "development",
    });
  } catch {
    res.status(503).json({ status: "error", db: "disconnected" });
  }
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
app.use("/auth", authLimiter, authRouter);
app.use("/articles", articleRouter);
app.use("/comments", commentsRouter);
app.use("/tags", tagsRouter);

app.use(errorHandler);

export default app;
