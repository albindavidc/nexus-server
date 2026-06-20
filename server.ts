import "dotenv/config";
import "reflect-metadata";
import path from "path";
import dotenv from "dotenv";

const envPath = path.resolve(__dirname, "./config/.env");
const envResult = dotenv.config({ path: envPath });
if (envResult.error) {
  const fallbackPath = path.resolve(__dirname, "../config/.env");
  dotenv.config({ path: fallbackPath });
}

import http from "http";
import { registerDependencies } from "./shared/di/container";
import { createApp } from "./app";
import { connectDatabase } from "./config/database.config";
import { initSocket } from "./modules/chat/chat.gateway";
import logger from "./shared/utils/logger";

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  // 1. Register DI first
  registerDependencies();

  // 2. Connect DB
  await connectDatabase();

  // 3. Create Express App
  const app = createApp();
  const httpServer = http.createServer(app);

  // 4. Initialize WebSockets
  initSocket(httpServer, process.env.CLIENT_URL as string, app);

  // 5. Start Server
  httpServer.listen(PORT, () => {
    logger.info(`\n===============================================\n🌟 Server running on port ${PORT} [${process.env.NODE_ENV || "development"}]\n===============================================`);
  });
}

bootstrap().catch((error) => {
  logger.error("Failed to start server", error);
  process.exit(1);
});
