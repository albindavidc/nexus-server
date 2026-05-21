import { Request, Response, NextFunction } from "express";
import logger from "../shared/utils/logger";
import AppError from "../shared/errors/AppError";

export class ErrorMiddleware {
  handle = (err: Error & { status?: number; code?: number; keyValue?: Record<string, unknown> }, req: Request, res: Response, _next: NextFunction): void => {
    logger.error(`${err.name ?? "Error"} - ${err.message}`, err);

    if (err instanceof AppError) {
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
      message:
        process.env.NODE_ENV === "production"
          ? "Internal Server Error"
          : err.message ?? "Internal Server Error",
    });
  };
}

const errorMiddlewareInstance = new ErrorMiddleware();
export const errorMiddleware = errorMiddlewareInstance.handle;
