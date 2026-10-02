import express from "express";
import cors from "cors";

import routes from "./routes";

const app = express();

app.use(cors());

app.use(express.json({ limit: "3mb" }));
app.use(express.urlencoded({ extended: true, limit: "3mb" }));

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running"
  });
});

app.use("/api", routes);

export default app;