"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.list = list;
exports.unreadCount = unreadCount;
exports.markAsRead = markAsRead;
exports.markAllAsRead = markAllAsRead;
exports.dismiss = dismiss;
const apiResponse_1 = require("../../shared/utils/apiResponse");
const svc = __importStar(require("./notification.service"));
async function list(req, res) {
    const result = await svc.listNotifications(req.user.id, req.query);
    (0, apiResponse_1.sendPaginated)(res, result.data, result.meta);
}
async function unreadCount(req, res) {
    const count = await svc.getUnreadCount(req.user.id);
    (0, apiResponse_1.sendSuccess)(res, { count });
}
async function markAsRead(req, res) {
    await svc.markAsRead(req.user.id, req.params.id);
    (0, apiResponse_1.sendSuccess)(res, null, 'Marked as read');
}
async function markAllAsRead(req, res) {
    const count = await svc.markAllAsRead(req.user.id);
    (0, apiResponse_1.sendSuccess)(res, { count }, `${count} notifications marked as read`);
}
async function dismiss(req, res) {
    await svc.dismissNotification(req.user.id, req.params.id);
    (0, apiResponse_1.sendSuccess)(res, null, 'Notification dismissed');
}
//# sourceMappingURL=notification.controller.js.map