// ═══════════════════════════════════════════════════════════════
// src/modules/training/training.model.ts
// ═══════════════════════════════════════════════════════════════

import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

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
        "VideoPaused",
        "VideoProgress",
        "VideoResumed",
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

// ── Training Media (native video/document storage) ──

export type MediaType = "video" | "pdf" | "document";
export type EncodingStatus = "pending" | "processing" | "ready" | "failed";

interface MediaAttributes {
  id: string;
  courseId: string;
  type: MediaType;
  title: string | null;
  titleAr: string | null;
  storageProvider: "gcs" | "external";
  storagePath: string | null;
  externalUrl: string | null;
  durationSec: number | null;
  fileSizeMb: number | null;
  mimeType: string | null;
  thumbnailPath: string | null;
  encodingStatus: EncodingStatus;
  sortOrder: number;
  createdBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MediaCreation extends Optional<
  MediaAttributes,
  | "id"
  | "type"
  | "title"
  | "titleAr"
  | "storageProvider"
  | "storagePath"
  | "externalUrl"
  | "durationSec"
  | "fileSizeMb"
  | "mimeType"
  | "thumbnailPath"
  | "encodingStatus"
  | "sortOrder"
  | "createdBy"
  | "createdAt"
  | "updatedAt"
> {}

export class TrainingMedia
  extends Model<MediaAttributes, MediaCreation>
  implements MediaAttributes
{
  declare id: string;
  declare courseId: string;
  declare type: MediaType;
  declare title: string | null;
  declare titleAr: string | null;
  declare storageProvider: "gcs" | "external";
  declare storagePath: string | null;
  declare externalUrl: string | null;
  declare durationSec: number | null;
  declare fileSizeMb: number | null;
  declare mimeType: string | null;
  declare thumbnailPath: string | null;
  declare encodingStatus: EncodingStatus;
  declare sortOrder: number;
  declare createdBy: string | null;
}

TrainingMedia.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    courseId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "course_id",
      references: { model: "training_courses", key: "id" },
    },
    type: {
      type: DataTypes.STRING(20),
      defaultValue: "video",
    },
    title: { type: DataTypes.STRING(500) },
    titleAr: { type: DataTypes.STRING(500), field: "title_ar" },
    storageProvider: {
      type: DataTypes.STRING(10),
      defaultValue: "gcs",
      field: "storage_provider",
    },
    storagePath: { type: DataTypes.TEXT, field: "storage_path" },
    externalUrl: { type: DataTypes.TEXT, field: "external_url" },
    durationSec: { type: DataTypes.INTEGER, field: "duration_sec" },
    fileSizeMb: { type: DataTypes.DECIMAL(10, 2), field: "file_size_mb" },
    mimeType: { type: DataTypes.STRING(100), field: "mime_type" },
    thumbnailPath: { type: DataTypes.TEXT, field: "thumbnail_path" },
    encodingStatus: {
      type: DataTypes.STRING(20),
      defaultValue: "pending",
      field: "encoding_status",
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: "sort_order",
    },
    createdBy: { type: DataTypes.UUID, field: "created_by" },
  },
  {
    sequelize,
    tableName: "training_media",
    underscored: true,
    timestamps: true,
  },
);

// ── Associations ──
TrainingCourse.hasMany(TrainingMedia, {
  foreignKey: "courseId",
  as: "media",
});
TrainingMedia.belongsTo(TrainingCourse, {
  foreignKey: "courseId",
  as: "course",
});
