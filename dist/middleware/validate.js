"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
const zod_1 = require("zod");
const apiResponse_1 = require("../shared/utils/apiResponse");
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
                (0, apiResponse_1.sendError)(res, 'Validation failed', 422, JSON.stringify(errors));
            }
            else {
                next(err);
            }
        }
    };
}
//# sourceMappingURL=validate.js.map