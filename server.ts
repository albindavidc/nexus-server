import "reflect-metadata";
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "./config/.env") });

import { registerDependencies } from "./shared/di/container";
registerDependencies();

import { Application } from "./app";
import { DatabaseConnection } from "./config/db";
import { initSocket } from "./modules/chat/chat.gateway";
import logger from "./shared/utils/logger";
import http from "http";

async function startServer(): Promise<void> {
  try {
    const db = new DatabaseConnection(process.env.MONGO_URI as string);
    await db.connect();

    const application = new Application();
    const expressApp = application.getApp();

    const httpServer = http.createServer(expressApp);

    initSocket(httpServer, process.env.CLIENT_URL as string);

    const port = process.env.PORT ?? 5000;
    httpServer.listen(port, () => {
      logger.info(`Server started on port ${port}`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
