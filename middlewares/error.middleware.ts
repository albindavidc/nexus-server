import { Request, Response, NextFunction } from "express";
import logger from "../shared/utils/logger";
import AppError from "../shared/errors/AppError";

/**
 * ErrorMiddleware — Single Responsibility: centralised Express error handling.
 * Open/Closed: new error types can be added in `handle` without breaking other error cases.
 */
export class ErrorMiddleware {
  /**
   * Express 4-argument error handler. Must be registered LAST in app.use().
   */
  handle = (err: any, req: Request, res: Response, next: NextFunction): void => {
    logger.error(`${err.name ?? "Error"} - ${err.message}`, err);

    // AppError / operational errors (4xx)
    if (err instanceof AppError) {
      res.status(err.status).json({
        success: false,
        message: err.message,
      });
      return;
    }

    // Mongoose ValidationError
    if (err.name === "ValidationError") {
      res.status(400).json({
        success: false,
        message: err.message,
      });
      return;
    }

    // MongoDB duplicate key (E11000)
    if (err.code === 11000) {
      const field = err.keyValue ? Object.keys(err.keyValue)[0] : "Field";
      const formattedField = field.charAt(0).toUpperCase() + field.slice(1);
      res.status(400).json({
        success: false,
        message: `${formattedField} already exists`,
      });
      return;
    }

    // JWT errors
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
      return;
    }

    // Unhandled / programming errors — return generic message in prod
    res.status(500).json({
      success: false,
      message:
        process.env.NODE_ENV === "production"
          ? "Internal Server Error"
          : err.message ?? "Internal Server Error",
    });
  };
}

// Singleton instance + named export for Express app.use()
const errorMiddlewareInstance = new ErrorMiddleware();
export const errorMiddleware = errorMiddlewareInstance.handle;
