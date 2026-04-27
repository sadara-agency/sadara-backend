// ─────────────────────────────────────────────────────────────
// src/modules/analystviews/analystview.model.ts
// Saved analyst views — captures the URL search-param state of
// any analyst page so the user can replay the same filters later.
// ─────────────────────────────────────────────────────────────
import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

export const ANALYST_PERSONAS = [
  "Performance",
  "Data",
  "Scouting",
  "Commercial",
] as const;

export type AnalystPersona = (typeof ANALYST_PERSONAS)[number];

export const ANALYST_VIEW_SHARE_SCOPES = [
  "private",
  "tenant",
  "roles",
] as const;

export type AnalystViewShareScope = (typeof ANALYST_VIEW_SHARE_SCOPES)[number];

export interface AnalystViewAttributes {
  id: string;
  ownerUserId: string;
  persona: AnalystPersona;
  name: string;
  description: string | null;
  routePath: string;
  paramsJson: Record<string, unknown>;
  isPinned: boolean;
  isShared: boolean;
  shareScope: AnalystViewShareScope;
  sharedRoleIds: string[] | null;
  lastViewedAt: Date | null;
  viewCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface AnalystViewCreationAttributes extends Optional<
  AnalystViewAttributes,
  | "id"
  | "description"
  | "isPinned"
  | "isShared"
  | "shareScope"
  | "sharedRoleIds"
  | "lastViewedAt"
  | "viewCount"
  | "createdAt"
  | "updatedAt"
> {}

export class AnalystView
  extends Model<AnalystViewAttributes, AnalystViewCreationAttributes>
  implements AnalystViewAttributes
{
  declare id: string;
  declare ownerUserId: string;
  declare persona: AnalystPersona;
  declare name: string;
  declare description: string | null;
  declare routePath: string;
  declare paramsJson: Record<string, unknown>;
  declare isPinned: boolean;
  declare isShared: boolean;
  declare shareScope: AnalystViewShareScope;
  declare sharedRoleIds: string[] | null;
  declare lastViewedAt: Date | null;
  declare viewCount: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

AnalystView.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    ownerUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "owner_user_id",
    },
    persona: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    routePath: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "route_path",
    },
    paramsJson: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      field: "params_json",
    },
    isPinned: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_pinned",
    },
    isShared: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_shared",
    },
    shareScope: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "private",
      field: "share_scope",
    },
    sharedRoleIds: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: "shared_role_ids",
    },
    lastViewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "last_viewed_at",
    },
    viewCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "view_count",
    },
  },
  {
    sequelize,
    tableName: "analyst_views",
    underscored: true,
    timestamps: true,
  },
);

export default AnalystView;
