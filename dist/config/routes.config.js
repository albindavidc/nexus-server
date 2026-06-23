"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = registerRoutes;
const auth_routes_1 = __importDefault(require("../modules/auth/auth.routes"));
const chat_routes_1 = __importDefault(require("../modules/chat/chat.routes"));
const notification_routes_1 = __importDefault(require("../modules/push-notification/notification.routes"));
const notification_routes_2 = __importDefault(require("../modules/notification/notification.routes"));
function registerRoutes(app) {
    app.use("/api/v1/auth", (0, auth_routes_1.default)());
    app.use("/api/v1/chat", (0, chat_routes_1.default)());
    app.use("/api/v1/push-notification", (0, notification_routes_1.default)());
    app.use("/api/v1/notifications", (0, notification_routes_2.default)());
}
