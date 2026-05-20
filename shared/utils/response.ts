import { Response } from "express";

/**
 * ResponseHelper — Static utility class for standardised HTTP responses.
 * Single Responsibility: shape and send JSON API responses.
 * Open/Closed: add new response types (e.g. paginated) without modifying existing methods.
 */
export class ResponseHelper {
  static success(
    res: Response,
    statusCode: number = 200,
    message: string = "Success",
    data: any = null
  ): void {
    res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static error(
    res: Response,
    statusCode: number = 500,
    message: string = "Internal Server Error"
  ): void {
    res.status(statusCode).json({
      success: false,
      message,
      data: null,
    });
  }

  static paginated(
    res: Response,
    statusCode: number = 200,
    message: string = "Success",
    data: any,
    meta: PaginationMeta
  ): void {
    res.status(statusCode).json({
      success: true,
      message,
      data,
      meta,
    });
  }
}

export interface PaginationMeta {
  total?: number;
  page?: number;
  limit?: number;
  hasMore?: boolean;
}

// Backwards-compatible named exports for code still using the old API
export const sendSuccess = ResponseHelper.success.bind(ResponseHelper);
export const sendError = ResponseHelper.error.bind(ResponseHelper);
