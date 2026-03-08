import express from "express";
import { prisma } from "./lib/prisma.js";
import authRouter from "./routes/auth.route.js";
import articleRouter from "./routes/articles.route.js";
import commentsRouter from "./routes/comments.route.js";
import tagsRouter from "./routes/tags.route.js";
import errorHandler from "./middlewares/error.middleware.js";
const app = express();

app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      version: "1.0.0",
      uptime: Math.round(process.uptime()),
      db: "connected",
    });
  } catch {
    res.status(503).json({ status: "error", db: "disconnected" });
  }
});

app.use("/auth", authRouter);
app.use("/articles", articleRouter);
app.use("/comments", commentsRouter);
app.use("/tags", tagsRouter);

app.use(errorHandler);

export default app;
