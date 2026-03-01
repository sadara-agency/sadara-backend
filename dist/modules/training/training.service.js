"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCourses = listCourses;
exports.getCourseById = getCourseById;
exports.createCourse = createCourse;
exports.updateCourse = updateCourse;
exports.deleteCourse = deleteCourse;
exports.enrollPlayers = enrollPlayers;
exports.updateEnrollment = updateEnrollment;
exports.removeEnrollment = removeEnrollment;
exports.getPlayerEnrollments = getPlayerEnrollments;
const sequelize_1 = require("sequelize");
const training_model_1 = require("./training.model");
const player_model_1 = require("../players/player.model");
const errorHandler_1 = require("../../middleware/errorHandler");
const pagination_1 = require("../../shared/utils/pagination");
const PLAYER_ATTRS = ['id', 'firstName', 'lastName', 'firstNameAr', 'lastNameAr', 'position', 'photoUrl'];
// ── Courses ──
async function listCourses(queryParams) {
    const { limit, offset, page, sort, order, search } = (0, pagination_1.parsePagination)(queryParams, 'createdAt');
    const where = {};
    if (queryParams.category)
        where.category = queryParams.category;
    if (queryParams.isActive !== undefined)
        where.isActive = queryParams.isActive === 'true';
    if (search) {
        where[sequelize_1.Op.or] = [
            { title: { [sequelize_1.Op.iLike]: `%${search}%` } },
            { titleAr: { [sequelize_1.Op.iLike]: `%${search}%` } },
            { description: { [sequelize_1.Op.iLike]: `%${search}%` } },
        ];
    }
    const { count, rows } = await training_model_1.TrainingCourse.findAndCountAll({
        where, limit, offset,
        order: [[sort, order]],
        attributes: {
            include: [
                [sequelize_1.Sequelize.literal(`(SELECT COUNT(*) FROM training_enrollments WHERE training_enrollments.course_id = "TrainingCourse".id)`), 'enrollmentCount'],
                [sequelize_1.Sequelize.literal(`(SELECT COUNT(*) FROM training_enrollments WHERE training_enrollments.course_id = "TrainingCourse".id AND training_enrollments.status = 'Completed')`), 'completedCount'],
            ],
        },
        distinct: true,
    });
    return { data: rows, meta: (0, pagination_1.buildMeta)(count, page, limit) };
}
async function getCourseById(id) {
    const course = await training_model_1.TrainingCourse.findByPk(id, {
        include: [{
                model: training_model_1.TrainingEnrollment, as: 'enrollments',
                include: [{ model: player_model_1.Player, as: 'player', attributes: [...PLAYER_ATTRS] }],
            }],
    });
    if (!course)
        throw new errorHandler_1.AppError('Course not found', 404);
    return course;
}
async function createCourse(input, createdBy) {
    return training_model_1.TrainingCourse.create({ ...input, createdBy });
}
async function updateCourse(id, input) {
    const course = await training_model_1.TrainingCourse.findByPk(id);
    if (!course)
        throw new errorHandler_1.AppError('Course not found', 404);
    return course.update(input);
}
async function deleteCourse(id) {
    const course = await training_model_1.TrainingCourse.findByPk(id);
    if (!course)
        throw new errorHandler_1.AppError('Course not found', 404);
    await course.destroy();
    return { id };
}
// ── Enrollments ──
async function enrollPlayers(courseId, playerIds, assignedBy) {
    const course = await training_model_1.TrainingCourse.findByPk(courseId);
    if (!course)
        throw new errorHandler_1.AppError('Course not found', 404);
    const existing = await player_model_1.Player.findAll({
        where: { id: { [sequelize_1.Op.in]: playerIds } },
        attributes: ['id'],
    });
    if (existing.length !== playerIds.length) {
        throw new errorHandler_1.AppError('Some players not found', 404);
    }
    const records = playerIds.map(playerId => ({
        courseId, playerId, assignedBy,
    }));
    await training_model_1.TrainingEnrollment.bulkCreate(records, {
        updateOnDuplicate: ['assignedBy', 'updatedAt'],
    });
    return getCourseById(courseId);
}
async function updateEnrollment(enrollmentId, input) {
    const enrollment = await training_model_1.TrainingEnrollment.findByPk(enrollmentId);
    if (!enrollment)
        throw new errorHandler_1.AppError('Enrollment not found', 404);
    const updates = { ...input };
    if (input.status === 'InProgress' && !enrollment.startedAt) {
        updates.startedAt = new Date();
    }
    if (input.status === 'Completed') {
        updates.completedAt = new Date();
        updates.progressPct = 100;
    }
    return enrollment.update(updates);
}
async function removeEnrollment(enrollmentId) {
    const enrollment = await training_model_1.TrainingEnrollment.findByPk(enrollmentId);
    if (!enrollment)
        throw new errorHandler_1.AppError('Enrollment not found', 404);
    await enrollment.destroy();
    return { id: enrollmentId };
}
async function getPlayerEnrollments(playerId) {
    return training_model_1.TrainingEnrollment.findAll({
        where: { playerId },
        include: [{ model: training_model_1.TrainingCourse, as: 'course' }],
        order: [['enrolledAt', 'DESC']],
    });
}
//# sourceMappingURL=training.service.js.map