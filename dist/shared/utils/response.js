"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendError = exports.sendSuccess = exports.ResponseHelper = void 0;
class ResponseHelper {
    static success(res, statusCode = 200, message = "Success", data = null) {
        res.status(statusCode).json({
            success: true,
            message,
            data,
        });
    }
    static error(res, statusCode = 500, message = "Internal Server Error") {
        res.status(statusCode).json({
            success: false,
            message,
            data: null,
        });
    }
    static paginated(res, statusCode = 200, message = "Success", data, meta) {
        res.status(statusCode).json({
            success: true,
            message,
            data,
            meta,
        });
    }
}
exports.ResponseHelper = ResponseHelper;
exports.sendSuccess = ResponseHelper.success.bind(ResponseHelper);
exports.sendError = ResponseHelper.error.bind(ResponseHelper);
