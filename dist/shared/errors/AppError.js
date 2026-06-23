"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class AppError extends Error {
    status;
    constructor(message, status) {
        super(message);
        this.status = status;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.default = AppError;
