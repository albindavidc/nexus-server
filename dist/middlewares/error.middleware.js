"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMiddleware = exports.ErrorMiddleware = void 0;
const logger_1 = __importDefault(require("../shared/utils/logger"));
const AppError_1 = __importDefault(require("../shared/errors/AppError"));
class ErrorMiddleware {
    handle = (err, req, res, _next) => {
        logger_1.default.error(`${err.name ?? "Error"} - ${err.message}`, err);
        if (err instanceof AppError_1.default) {
            res.status(err.status).json({
                success: false,
                message: err.message,
            });
            return;
        }
        if (err.name === "ValidationError") {
            res.status(400).json({
                success: false,
                message: err.message,
            });
            return;
        }
        if (err.code === 11000) {
            const field = err.keyValue ? Object.keys(err.keyValue)[0] : "Field";
            const formattedField = field.charAt(0).toUpperCase() + field.slice(1);
            res.status(400).json({
                success: false,
                message: `${formattedField} already exists`,
            });
            return;
        }
        if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
            res.status(401).json({
                success: false,
                message: "Invalid or expired token",
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: process.env.NODE_ENV === "production"
                ? "Internal Server Error"
                : err.message ?? "Internal Server Error",
        });
    };
}
exports.ErrorMiddleware = ErrorMiddleware;
const errorMiddlewareInstance = new ErrorMiddleware();
exports.errorMiddleware = errorMiddlewareInstance.handle;
