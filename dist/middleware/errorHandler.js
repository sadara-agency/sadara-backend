"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.errorHandler = errorHandler;
exports.asyncHandler = asyncHandler;
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
class AppError extends Error {
    statusCode;
    isOperational;
    constructor(message, statusCode = 400, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
exports.AppError = AppError;
function errorHandler(err, req, res, _next) {
    if (err instanceof AppError) {
        // Operational errors — expected, log at warn level
        logger_1.logger.warn('Operational error', {
            status: err.statusCode,
            message: err.message,
            path: req.path,
            method: req.method,
        });
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
        });
        return;
    }
    // Unexpected errors — log full stack at error level
    logger_1.logger.error('Unexpected error', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        body: env_1.env.nodeEnv === 'development' ? req.body : undefined,
    });
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        // Only expose details in development
        ...(env_1.env.nodeEnv === 'development' && {
            error: err.message,
            stack: err.stack,
        }),
    });
}
// Catch async errors automatically
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
//# sourceMappingURL=errorHandler.js.map