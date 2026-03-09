import "dotenv/config";
import { prisma } from "./lib/prisma.js";
import app from "./app.js";

const PORT = process.env.PORT || 3000;

prisma
  .$connect()
  .then(() => {
    console.log("Connected to the database successfully.");
  })
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

    const shutdown = async () => {
      server.close(async () => {
        await prisma.$disconnect();
        process.exit(0);
      });
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  })
  .catch((error: unknown) => {
    console.error("Database connection error:", error);
    process.exit(1);
  });
