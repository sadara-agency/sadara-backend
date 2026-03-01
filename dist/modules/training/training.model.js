"use strict";
// ═══════════════════════════════════════════════════════════════
// src/modules/training/training.model.ts
// ═══════════════════════════════════════════════════════════════
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrainingEnrollment = exports.TrainingCourse = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../../config/database");
class TrainingCourse extends sequelize_1.Model {
}
exports.TrainingCourse = TrainingCourse;
TrainingCourse.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    title: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    titleAr: { type: sequelize_1.DataTypes.STRING, field: 'title_ar' },
    description: { type: sequelize_1.DataTypes.TEXT },
    descriptionAr: { type: sequelize_1.DataTypes.TEXT, field: 'description_ar' },
    contentType: { type: sequelize_1.DataTypes.ENUM('Video', 'PDF', 'Link', 'Exercise', 'Mixed'), defaultValue: 'Mixed', field: 'content_type' },
    contentUrl: { type: sequelize_1.DataTypes.STRING(500), field: 'content_url' },
    category: { type: sequelize_1.DataTypes.STRING(50) },
    difficulty: { type: sequelize_1.DataTypes.STRING(20), defaultValue: 'Intermediate' },
    durationHours: { type: sequelize_1.DataTypes.FLOAT, field: 'duration_hours' },
    isActive: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
    createdBy: { type: sequelize_1.DataTypes.UUID, field: 'created_by' },
}, { sequelize: database_1.sequelize, tableName: 'training_courses', underscored: true, timestamps: true });
class TrainingEnrollment extends sequelize_1.Model {
}
exports.TrainingEnrollment = TrainingEnrollment;
TrainingEnrollment.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    courseId: { type: sequelize_1.DataTypes.UUID, allowNull: false, field: 'course_id' },
    playerId: { type: sequelize_1.DataTypes.UUID, allowNull: false, field: 'player_id' },
    status: { type: sequelize_1.DataTypes.ENUM('NotStarted', 'InProgress', 'Completed', 'Dropped'), defaultValue: 'NotStarted' },
    progressPct: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0, field: 'progress_pct' },
    enrolledAt: { type: sequelize_1.DataTypes.DATE, defaultValue: sequelize_1.DataTypes.NOW, field: 'enrolled_at' },
    startedAt: { type: sequelize_1.DataTypes.DATE, field: 'started_at' },
    completedAt: { type: sequelize_1.DataTypes.DATE, field: 'completed_at' },
    notes: { type: sequelize_1.DataTypes.TEXT },
    assignedBy: { type: sequelize_1.DataTypes.UUID, field: 'assigned_by' },
}, { sequelize: database_1.sequelize, tableName: 'training_enrollments', underscored: true, timestamps: true });
//# sourceMappingURL=training.model.js.map