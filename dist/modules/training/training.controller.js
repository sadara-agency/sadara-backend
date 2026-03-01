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
exports.listCourses = listCourses;
exports.getCourse = getCourse;
exports.createCourse = createCourse;
exports.updateCourse = updateCourse;
exports.deleteCourse = deleteCourse;
exports.enrollPlayers = enrollPlayers;
exports.updateEnrollment = updateEnrollment;
exports.removeEnrollment = removeEnrollment;
exports.playerEnrollments = playerEnrollments;
const apiResponse_1 = require("../../shared/utils/apiResponse");
const audit_1 = require("../../shared/utils/audit");
const svc = __importStar(require("./training.service"));
async function listCourses(req, res) {
    const result = await svc.listCourses(req.query);
    (0, apiResponse_1.sendPaginated)(res, result.data, result.meta);
}
async function getCourse(req, res) {
    const course = await svc.getCourseById(req.params.id);
    (0, apiResponse_1.sendSuccess)(res, course);
}
async function createCourse(req, res) {
    const course = await svc.createCourse(req.body, req.user.id);
    await (0, audit_1.logAudit)('CREATE', 'training', course.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Created course: ${course.title}`);
    (0, apiResponse_1.sendCreated)(res, course);
}
async function updateCourse(req, res) {
    const course = await svc.updateCourse(req.params.id, req.body);
    (0, apiResponse_1.sendSuccess)(res, course, 'Course updated');
}
async function deleteCourse(req, res) {
    const result = await svc.deleteCourse(req.params.id);
    await (0, audit_1.logAudit)('DELETE', 'training', result.id, (0, audit_1.buildAuditContext)(req.user, req.ip), 'Course deleted');
    (0, apiResponse_1.sendSuccess)(res, result, 'Course deleted');
}
async function enrollPlayers(req, res) {
    const course = await svc.enrollPlayers(req.params.id, req.body.playerIds, req.user.id);
    await (0, audit_1.logAudit)('UPDATE', 'training', req.params.id, (0, audit_1.buildAuditContext)(req.user, req.ip), `Enrolled ${req.body.playerIds.length} players`);
    (0, apiResponse_1.sendSuccess)(res, course, 'Players enrolled');
}
async function updateEnrollment(req, res) {
    const enrollment = await svc.updateEnrollment(req.params.enrollmentId, req.body);
    (0, apiResponse_1.sendSuccess)(res, enrollment, 'Enrollment updated');
}
async function removeEnrollment(req, res) {
    const result = await svc.removeEnrollment(req.params.enrollmentId);
    (0, apiResponse_1.sendSuccess)(res, result, 'Enrollment removed');
}
async function playerEnrollments(req, res) {
    const enrollments = await svc.getPlayerEnrollments(req.params.playerId);
    (0, apiResponse_1.sendSuccess)(res, enrollments);
}
//# sourceMappingURL=training.controller.js.map