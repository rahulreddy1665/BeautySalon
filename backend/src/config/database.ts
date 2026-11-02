import mongoose from "mongoose";

export const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error("MONGO_URI is not defined");
    }

    await mongoose.connect(mongoUri, {
      // One small app instance: 10 connections is plenty and stays far below
      // the Atlas tier's connection limit.
      maxPoolSize: 10,
      // Fail fast instead of hanging requests for 30 s when Atlas is unreachable.
      serverSelectionTimeoutMS: 10_000,
      socketTimeoutMS: 45_000,
      // Don't build indexes on every production boot; run `npm run sync-indexes`.
      autoIndex: process.env.NODE_ENV !== "production",
    });

    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
};