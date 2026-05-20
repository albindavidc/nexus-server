import mongoose from "mongoose";
import logger from "../shared/utils/logger";

/**
 * DatabaseConnection — Single Responsibility: manages the MongoDB connection lifecycle.
 * Using a class allows mocking in tests and clean separation from bootstrap logic.
 */
export class DatabaseConnection {
  private readonly uri: string;

  constructor(uri: string) {
    this.uri = uri;
  }

  async connect(): Promise<void> {
    try {
      const connection = await mongoose.connect(this.uri);
      logger.info(`Database Connected: ${connection.connection.host}`);
    } catch (error) {
      logger.error("Database connection failed:", error);
      process.exit(1);
    }
  }

  async disconnect(): Promise<void> {
    await mongoose.disconnect();
    logger.info("Database disconnected.");
  }
}
