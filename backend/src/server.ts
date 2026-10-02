import dotenv from "dotenv";

dotenv.config();

import app from "./app";
import { connectDatabase } from "./config/database";

const PORT = Number(process.env.PORT) || 8080;

const startServer = async (): Promise<void> => {
  await connectDatabase();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer();
