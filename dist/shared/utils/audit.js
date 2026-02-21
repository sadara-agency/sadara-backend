"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAudit = logAudit;
exports.buildAuditContext = buildAuditContext;
const AuditLog_model_1 = require("../../modules/audit/AuditLog.model");
async function logAudit(action, entity, entityId, context, detail, changes) {
    try {
        // Sequelize handles the INSERT and JSON stringifying automatically
        await AuditLog_model_1.AuditLog.create({
            action,
            userId: context.userId,
            userName: context.userName,
            userRole: context.userRole,
            entity,
            entityId,
            detail: detail || null,
            changes: changes || null,
            ipAddress: context.ip || null,
        });
    }
    catch (err) {
        console.error('Audit log error:', err);
    }
}
function buildAuditContext(user, ip) {
    return {
        userId: user.id,
        userName: user.fullName,
        userRole: user.role,
        ip,
    };
}
//# sourceMappingURL=audit.js.map