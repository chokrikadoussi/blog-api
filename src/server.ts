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
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error: unknown) => {
    console.error("Database connection error:", error);
    process.exit(1); // Exit the process if the database connection fails
  });
