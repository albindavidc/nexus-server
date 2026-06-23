"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const winston_1 = require("winston");
class Logger {
    static instance;
    logger;
    constructor() {
        this.logger = (0, winston_1.createLogger)({
            level: process.env.NODE_ENV === "production" ? "info" : "debug",
            format: winston_1.format.combine(winston_1.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), winston_1.format.errors({ stack: true }), winston_1.format.printf(({ level, timestamp, message, stack }) => {
                return stack
                    ? `${timestamp} [${level.toUpperCase()}] ${message}\n${stack}`
                    : `${timestamp} [${level.toUpperCase()}] ${message}`;
            })),
            transports: [
                new winston_1.transports.Console({
                    format: winston_1.format.combine(winston_1.format.colorize(), winston_1.format.simple()),
                }),
                new winston_1.transports.File({ filename: "tmp/logs/error.log", level: "error" }),
                new winston_1.transports.File({ filename: "tmp/logs/all.log", level: "info" }),
            ],
        });
    }
    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }
    info(message, ...meta) {
        this.logger.info(message, ...meta);
    }
    warn(message, ...meta) {
        this.logger.warn(message, ...meta);
    }
    error(message, ...meta) {
        this.logger.error(message, ...meta);
    }
    debug(message, ...meta) {
        this.logger.debug(message, ...meta);
    }
}
exports.Logger = Logger;
exports.default = Logger.getInstance();
