import { Response } from "express";

export class ResponseHelper {
  static success(
    res: Response,
    statusCode: number = 200,
    message: string = "Success",
    data: unknown = null
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
    data: unknown,
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

export const sendSuccess = ResponseHelper.success.bind(ResponseHelper);
export const sendError = ResponseHelper.error.bind(ResponseHelper);
