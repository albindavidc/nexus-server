import "reflect-metadata";
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "./config/.env") });

// Register DI bindings BEFORE any module imports controllers/services
import { registerDependencies } from "./shared/di/container";
registerDependencies();

import { Application } from "./app";
import { DatabaseConnection } from "./config/db";
import { initSocket } from "./modules/chat/chat.gateway";
import logger from "./shared/utils/logger";
import http from "http";

/**
 * Server bootstrap — Single Responsibility: wire up and start the HTTP server.
 * All application config lives in Application; all DB config in DatabaseConnection.
 */
async function startServer(): Promise<void> {
  try {
    // 1. Connect to database
    const db = new DatabaseConnection(process.env.MONGO_URI as string);
    await db.connect();

    // 2. Build Express app
    const application = new Application();
    const expressApp = application.getApp();

    // 3. Create HTTP server (needed for Socket.IO)
    const httpServer = http.createServer(expressApp);

    // 4. Attach Socket.IO gateway
    initSocket(httpServer, process.env.CLIENT_URL as string);

    // 5. Start listening
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
