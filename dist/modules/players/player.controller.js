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
const playerService = __importStar(require("./player.service"));
async function list(req, res) {
    // queryParams are handled inside the service with Sequelize Operators (Op)
    const result = await playerService.listPlayers(req.query);
    (0, apiResponse_1.sendPaginated)(res, result.data, result.meta);
}
async function getById(req, res) {
    const player = await playerService.getPlayerById(req.params.id);
    (0, apiResponse_1.sendSuccess)(res, player);
}
async function create(req, res) {
    // req.user!.id is passed as createdBy
    const player = await playerService.createPlayer(req.body, req.user.id);
    // Using the new Sequelize property names for the audit log
    await (0, audit_1.logAudit)('CREATE', 'players', player.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Created player: ${player.firstName} ${player.lastName}`);
    (0, apiResponse_1.sendCreated)(res, player);
}
async function update(req, res) {
    const player = await playerService.updatePlayer(req.params.id, req.body);
    await (0, audit_1.logAudit)('UPDATE', 'players', player.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Updated player: ${player.firstName} ${player.lastName}`);
    (0, apiResponse_1.sendSuccess)(res, player, 'Player updated');
}
async function remove(req, res) {
    const result = await playerService.deletePlayer(req.params.id);
    await (0, audit_1.logAudit)('DELETE', 'players', result.id, (0, audit_1.buildAuditContext)(req.user, req.ip), 'Player deleted');
    (0, apiResponse_1.sendSuccess)(res, result, 'Player deleted');
}
// export async function getStats(req: AuthRequest, res: Response) {
//   const stats = await playerService.getPlayerStats(req.params.id);
//   sendSuccess(res, stats);
// }
//# sourceMappingURL=player.controller.js.map