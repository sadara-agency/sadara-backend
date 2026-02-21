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
exports.getById = getById;
exports.create = create;
exports.update = update;
exports.remove = remove;
const apiResponse_1 = require("../../shared/utils/apiResponse");
const audit_1 = require("../../shared/utils/audit");
const svc = __importStar(require("./document.service"));
async function list(req, res) { const r = await svc.listDocuments(req.query); (0, apiResponse_1.sendPaginated)(res, r.data, r.meta); }
async function getById(req, res) { (0, apiResponse_1.sendSuccess)(res, await svc.getDocumentById(req.params.id)); }
async function create(req, res) {
    const doc = await svc.createDocument(req.body, req.user.id);
    await (0, audit_1.logAudit)('CREATE', 'documents', doc.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Uploaded: ${doc.name}`);
    (0, apiResponse_1.sendCreated)(res, doc);
}
async function update(req, res) {
    const doc = await svc.updateDocument(req.params.id, req.body);
    await (0, audit_1.logAudit)('UPDATE', 'documents', doc.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Updated: ${doc.name}`);
    (0, apiResponse_1.sendSuccess)(res, doc, 'Document updated');
}
async function remove(req, res) {
    const r = await svc.deleteDocument(req.params.id);
    await (0, audit_1.logAudit)('DELETE', 'documents', r.id, (0, audit_1.buildAuditContext)(req.user, req.ip), 'Document deleted');
    (0, apiResponse_1.sendSuccess)(res, r, 'Document deleted');
}
//# sourceMappingURL=document.controller.js.map