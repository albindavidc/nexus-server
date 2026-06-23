"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const cors_config_1 = require("./config/cors.config");
const routes_config_1 = require("./config/routes.config");
const error_middleware_1 = require("./middlewares/error.middleware");
const request_id_middleware_1 = require("./middlewares/request-id.middleware");
function createApp() {
    const app = (0, express_1.default)();
    // Middlewares
    app.use(request_id_middleware_1.requestIdMiddleware);
    app.use(express_1.default.json({ limit: "10kb" }));
    app.use(express_1.default.urlencoded({ extended: true }));
    app.use((0, cookie_parser_1.default)());
    app.use((0, cors_1.default)(cors_config_1.corsConfig));
    app.use((0, helmet_1.default)({
        crossOriginResourcePolicy: false,
        crossOriginOpenerPolicy: false,
    }));
    app.use((0, morgan_1.default)(process.env.NODE_ENV === "production" ? "combined" : "dev"));
    // Health check
    app.get("/health", (_, res) => {
        res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
    });
    // Routes
    (0, routes_config_1.registerRoutes)(app);
    // 404
    app.use((req, res) => {
        res.status(404).json({
            success: false,
            message: `Route ${req.originalUrl} not found`,
        });
    });
    // Error handling
    app.use(error_middleware_1.errorMiddleware);
    return app;
}
