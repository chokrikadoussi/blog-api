import express from "express";
import "dotenv/config";
import { prisma } from "./lib/prisma.js";

const app = express();
const PORT = process.env.PORT || 3000;

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

prisma
  .$connect()
  .then(() => {
    console.log("Connected to the database successfully.");
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error: unknown) => {
    console.error("Database connection error:", error);
    process.exit(1); // Exit the process if the database connection fails
  });
