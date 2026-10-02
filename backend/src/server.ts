import dotenv from "dotenv";

dotenv.config();

import app from "./app";
import { connectDatabase } from "./config/database";
console.log(process.env.PORT, process.env.JWT_ACCESS_SECRET);

const PORT = Number(process.env.PORT) || 8080;

const startServer = async (): Promise<void> => {
  await connectDatabase();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer();
