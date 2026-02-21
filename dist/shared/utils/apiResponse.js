"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSuccess = sendSuccess;
exports.sendPaginated = sendPaginated;
exports.sendCreated = sendCreated;
exports.sendError = sendError;
exports.sendNotFound = sendNotFound;
exports.sendUnauthorized = sendUnauthorized;
exports.sendForbidden = sendForbidden;
function sendSuccess(res, data, message, statusCode = 200) {
    const response = {
        success: true,
        data,
        message,
    };
    res.status(statusCode).json(response);
}
function sendPaginated(res, data, meta, message) {
    const response = {
        success: true,
        data,
        meta,
        message,
    };
    res.status(200).json(response);
}
function sendCreated(res, data, message = 'Created successfully') {
    sendSuccess(res, data, message, 201);
}
function sendError(res, message, statusCode = 400, error) {
    const response = {
        success: false,
        message,
        error,
    };
    res.status(statusCode).json(response);
}
function sendNotFound(res, entity = 'Resource') {
    sendError(res, `${entity} not found`, 404);
}
function sendUnauthorized(res, message = 'Unauthorized') {
    sendError(res, message, 401);
}
function sendForbidden(res, message = 'Forbidden') {
    sendError(res, message, 403);
}
//# sourceMappingURL=apiResponse.js.map