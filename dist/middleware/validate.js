"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
const zod_1 = require("zod");
const apiResponse_1 = require("../shared/utils/apiResponse");
const logger_1 = require("../config/logger");
function validate(schema, target = 'body') {
    return (req, res, next) => {
        try {
            const data = schema.parse(req[target]);
            req[target] = data;
            next();
        }
        catch (err) {
            if (err instanceof zod_1.ZodError) {
                const errors = err.errors.map((e) => ({
                    field: e.path.join('.'),
                    message: e.message,
                }));
                logger_1.logger.warn('Validation failed', {
                    target,
                    path: req.path,
                    errors,
                });
                (0, apiResponse_1.sendError)(res, 'Validation failed', 422, JSON.stringify(errors));
                return;
            }
            // Non-Zod errors bubble up to the global error handler
            next(err);
        }
    };
}
//# sourceMappingURL=validate.js.map