import { createLogger, format, transports, Logger as WinstonLogger } from "winston";

/**
 * Logger — Singleton class wrapping Winston.
 * Single Responsibility: application-wide structured logging.
 * Open/Closed: add new transports/formatters without modifying client code.
 */
export class Logger {
  private static instance: Logger;
  private readonly logger: WinstonLogger;

  private constructor() {
    this.logger = createLogger({
      level: process.env.NODE_ENV === "production" ? "info" : "debug",
      format: format.combine(
        format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        format.errors({ stack: true }),
        format.printf(({ level, timestamp, message, stack }) => {
          return stack
            ? `${timestamp} [${level.toUpperCase()}] ${message}\n${stack}`
            : `${timestamp} [${level.toUpperCase()}] ${message}`;
        })
      ),
      transports: [
        new transports.Console({
          format: format.combine(format.colorize(), format.simple()),
        }),
        new transports.File({ filename: "error.log", level: "error" }),
        new transports.File({ filename: "all.log", level: "info" }),
      ],
    });
  }

  /** Returns the single shared Logger instance (Singleton pattern). */
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  info(message: string, ...meta: any[]): void {
    this.logger.info(message, ...meta);
  }

  warn(message: string, ...meta: any[]): void {
    this.logger.warn(message, ...meta);
  }

  error(message: string, ...meta: any[]): void {
    this.logger.error(message, ...meta);
  }

  debug(message: string, ...meta: any[]): void {
    this.logger.debug(message, ...meta);
  }
}

// Default export: singleton instance for convenience
export default Logger.getInstance();
