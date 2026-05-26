import mongoose from "mongoose";
import logger from "../shared/utils/logger";

export class DatabaseConnection {
  private readonly uri: string;

  constructor(uri: string) {
    this.uri = uri;
  }

  async connect(): Promise<void> {
    try {
      const connection = await mongoose.connect(this.uri);
      logger.info(`\n===============================================\n🚀 Database Connected: ${connection.connection.host}\n===============================================`);
      
      const db = connection.connection.db;
      if (db) {
        const collections = await db.listCollections().toArray();
        const hasGroupConversations = collections.some(col => col.name === "groupconversations");
        if (hasGroupConversations) {
          logger.info("Migration: Found 'groupconversations' collection. Migrating to 'conversations'...");
          const groupCol = db.collection("groupconversations");
          const convCol = db.collection("conversations");
          
          const groups = await groupCol.find({}).toArray();
          for (const group of groups) {
            const exists = await convCol.findOne({ _id: group._id });
            if (!exists) {
              await convCol.insertOne(group);
              logger.info(`Migration: Migrated group '${group.name}' (${group._id})`);
            }
          }
          await groupCol.drop();
          logger.info("Migration: 'groupconversations' collection dropped successfully.");
        }
      }
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
