// ═══════════════════════════════════════════════════════════════
// src/modules/training/training.model.ts
// ═══════════════════════════════════════════════════════════════

import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../../config/database";

// ── Course ──

export type ContentType = "Video" | "PDF" | "Link" | "Exercise" | "Mixed";

interface CourseAttributes {
  id: string;
  title: string;
  titleAr?: string | null;
  description?: string | null;
  descriptionAr?: string | null;
  contentType: ContentType;
  contentUrl?: string | null;
  category?: string | null;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  durationHours?: number | null;
  isActive: boolean;
  createdBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CourseCreation extends Optional<
  CourseAttributes,
  "id" | "contentType" | "difficulty" | "isActive" | "createdAt" | "updatedAt"
> {}

export class TrainingCourse
  extends Model<CourseAttributes, CourseCreation>
  implements CourseAttributes
{
  declare id: string;
  declare title: string;
  declare titleAr: string | null;
  declare description: string | null;
  declare descriptionAr: string | null;
  declare contentType: ContentType;
  declare contentUrl: string | null;
  declare category: string | null;
  declare difficulty: "Beginner" | "Intermediate" | "Advanced";
  declare durationHours: number | null;
  declare isActive: boolean;
  declare createdBy: string | null;
}

TrainingCourse.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: { type: DataTypes.STRING, allowNull: false },
    titleAr: { type: DataTypes.STRING, field: "title_ar" },
    description: { type: DataTypes.TEXT },
    descriptionAr: { type: DataTypes.TEXT, field: "description_ar" },
    contentType: {
      type: DataTypes.ENUM("Video", "PDF", "Link", "Exercise", "Mixed"),
      defaultValue: "Mixed",
      field: "content_type",
    },
    contentUrl: { type: DataTypes.STRING(500), field: "content_url" },
    category: { type: DataTypes.STRING(50) },
    difficulty: { type: DataTypes.STRING(20), defaultValue: "Intermediate" },
    durationHours: { type: DataTypes.FLOAT, field: "duration_hours" },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: "is_active",
    },
    createdBy: { type: DataTypes.UUID, field: "created_by" },
  },
  {
    sequelize,
    tableName: "training_courses",
    underscored: true,
    timestamps: true,
  },
);

// ── Enrollment ──

export type EnrollmentStatus =
  | "NotStarted"
  | "InProgress"
  | "Completed"
  | "Dropped";

interface EnrollmentAttributes {
  id: string;
  courseId: string;
  playerId: string;
  status: EnrollmentStatus;
  progressPct: number;
  enrolledAt?: Date;
  startedAt?: Date | null;
  completedAt?: Date | null;
  notes?: string | null;
  assignedBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface EnrollmentCreation extends Optional<
  EnrollmentAttributes,
  "id" | "status" | "progressPct" | "createdAt" | "updatedAt"
> {}

export class TrainingEnrollment
  extends Model<EnrollmentAttributes, EnrollmentCreation>
  implements EnrollmentAttributes
{
  declare id: string;
  declare courseId: string;
  declare playerId: string;
  declare status: EnrollmentStatus;
  declare progressPct: number;
  declare enrolledAt: Date;
  declare startedAt: Date | null;
  declare completedAt: Date | null;
  declare notes: string | null;
  declare assignedBy: string | null;
}

TrainingEnrollment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    courseId: { type: DataTypes.UUID, allowNull: false, field: "course_id" },
    playerId: { type: DataTypes.UUID, allowNull: false, field: "player_id" },
    status: {
      type: DataTypes.ENUM("NotStarted", "InProgress", "Completed", "Dropped"),
      defaultValue: "NotStarted",
    },
    progressPct: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: "progress_pct",
    },
    enrolledAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "enrolled_at",
    },
    startedAt: { type: DataTypes.DATE, field: "started_at" },
    completedAt: { type: DataTypes.DATE, field: "completed_at" },
    notes: { type: DataTypes.TEXT },
    assignedBy: { type: DataTypes.UUID, field: "assigned_by" },
  },
  {
    sequelize,
    tableName: "training_enrollments",
    underscored: true,
    timestamps: true,
  },
);

// ═══════════════════════════════════════════════════════════════
// ADD TO: src/modules/training/training.model.ts
// Append after TrainingEnrollment.init(…) block
// ═══════════════════════════════════════════════════════════════

// ── Activity Log (content interaction tracking) ──

export type ActivityAction =
  | "Clicked"
  | "VideoStarted"
  | "VideoCompleted"
  | "Downloaded"
  | "Viewed";

interface ActivityAttributes {
  id: string;
  enrollmentId: string;
  playerId: string;
  courseId: string;
  action: ActivityAction;
  metadata?: Record<string, unknown> | null;
  createdAt?: Date;
}

interface ActivityCreation extends Optional<
  ActivityAttributes,
  "id" | "createdAt"
> {}

export class TrainingActivity
  extends Model<ActivityAttributes, ActivityCreation>
  implements ActivityAttributes
{
  declare id: string;
  declare enrollmentId: string;
  declare playerId: string;
  declare courseId: string;
  declare action: ActivityAction;
  declare metadata: Record<string, unknown> | null;
}

TrainingActivity.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    enrollmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "enrollment_id",
    },
    playerId: { type: DataTypes.UUID, allowNull: false, field: "player_id" },
    courseId: { type: DataTypes.UUID, allowNull: false, field: "course_id" },
    action: {
      type: DataTypes.ENUM(
        "Clicked",
        "VideoStarted",
        "VideoCompleted",
        "Downloaded",
        "Viewed",
      ),
      allowNull: false,
    },
    metadata: { type: DataTypes.JSONB },
  },
  {
    sequelize,
    tableName: "training_activities",
    underscored: true,
    timestamps: true,
    updatedAt: false, // append-only log — no updates
  },
);
