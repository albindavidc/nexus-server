"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
require("reflect-metadata");
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const envPath = path_1.default.resolve(__dirname, "./config/.env");
const envResult = dotenv_1.default.config({ path: envPath });
if (envResult.error) {
    const fallbackPath = path_1.default.resolve(__dirname, "../config/.env");
    dotenv_1.default.config({ path: fallbackPath });
}
const http_1 = __importDefault(require("http"));
const container_1 = require("./shared/di/container");
const database_config_1 = require("./config/database.config");
const chat_gateway_1 = require("./modules/chat/chat.gateway");
const logger_1 = __importDefault(require("./shared/utils/logger"));
const app_1 = require("./app");
const PORT = process.env.PORT || 5000;
async function bootstrap() {
    (0, container_1.registerDependencies)();
    await (0, database_config_1.connectDatabase)();
    const app = (0, app_1.createApp)();
    const httpServer = http_1.default.createServer(app);
    (0, chat_gateway_1.initSocket)(httpServer, process.env.CLIENT_URL, app);
    httpServer.listen(PORT, () => {
        logger_1.default.info(`\n=============================================\n🌟 Server running on port ${PORT} [${process.env.NODE_ENV || "development"}]
      \n=============================================`);
    });
}
bootstrap().catch((error) => {
    logger_1.default.error("Failed to start server", error);
    process.exit(1);
});
