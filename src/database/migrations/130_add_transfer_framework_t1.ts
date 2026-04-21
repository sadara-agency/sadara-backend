import { QueryInterface, DataTypes } from "sequelize";

const SUMMER_2026_ID = "c0000001-0000-0000-0000-000000000001";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  // ─── 1. transfer_windows ────────────────────────────────────────
  await queryInterface.createTable("transfer_windows", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    season: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    start_date: { type: DataTypes.DATEONLY, allowNull: false },
    end_date: { type: DataTypes.DATEONLY, allowNull: false },
    saff_window_start: { type: DataTypes.DATEONLY, allowNull: true },
    saff_window_end: { type: DataTypes.DATEONLY, allowNull: true },
    shortlist_threshold: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60,
    },
    weights: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        performance: 40,
        contractFit: 25,
        commercial: 20,
        culturalFit: 15,
      },
    },
    tier_targets: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: { A: 3, B: 7, C: 5 },
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "Upcoming",
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  await queryInterface.addIndex("transfer_windows", ["status"]);

  // ─── 2. Extend clubs ────────────────────────────────────────────
  await queryInterface.addColumn("clubs", "budget_sar", {
    type: DataTypes.BIGINT,
    allowNull: true,
  });
  await queryInterface.addColumn("clubs", "foreign_slots", {
    type: DataTypes.INTEGER,
    allowNull: true,
  });
  await queryInterface.addColumn("clubs", "key_contact_name", {
    type: DataTypes.STRING(100),
    allowNull: true,
  });
  await queryInterface.addColumn("clubs", "key_contact_email", {
    type: DataTypes.STRING(150),
    allowNull: true,
  });
  await queryInterface.addColumn("clubs", "key_contact_phone", {
    type: DataTypes.STRING(30),
    allowNull: true,
  });
  await queryInterface.addColumn("clubs", "last_contact_date", {
    type: DataTypes.DATEONLY,
    allowNull: true,
  });
  await queryInterface.addColumn("clubs", "interest_level", {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: "Cold",
  });

  // ─── 3. club_needs ──────────────────────────────────────────────
  await queryInterface.createTable("club_needs", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    club_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "clubs", key: "id" },
      onDelete: "CASCADE",
    },
    window_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "transfer_windows", key: "id" },
      onDelete: "CASCADE",
    },
    position: { type: DataTypes.STRING(30), allowNull: false },
    positional_gap_notes: { type: DataTypes.TEXT, allowNull: true },
    deal_preference: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "Either",
    },
    priority: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "Medium",
    },
    sadara_opportunity: { type: DataTypes.TEXT, allowNull: true },
    match_score: { type: DataTypes.INTEGER, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  await queryInterface.addConstraint("club_needs", {
    fields: ["club_id", "window_id", "position"],
    type: "unique",
    name: "club_needs_club_window_position_unique",
  });
  await queryInterface.addIndex("club_needs", ["window_id"]);
  await queryInterface.addIndex("club_needs", ["club_id"]);

  // ─── 4. Seed Summer 2026 ────────────────────────────────────────
  const now = new Date();
  await queryInterface.bulkInsert("transfer_windows", [
    {
      id: SUMMER_2026_ID,
      season: "Summer 2026",
      start_date: "2026-05-01",
      end_date: "2026-06-30",
      saff_window_start: "2026-05-01",
      saff_window_end: "2026-06-30",
      shortlist_threshold: 60,
      weights: JSON.stringify({
        performance: 40,
        contractFit: 25,
        commercial: 20,
        culturalFit: 15,
      }),
      tier_targets: JSON.stringify({ A: 3, B: 7, C: 5 }),
      status: "Active",
      notes:
        "Seeded by migration 130 — Summer 2026 window (May 1 – Jun 30, 2026).",
      created_at: now,
      updated_at: now,
    },
  ]);

  // ─── 5. One-off Admin permissions so T1A endpoints are usable ────
  // (proper role grants land in seed-shared.ts during T1B)
  await queryInterface.sequelize.query(`
    INSERT INTO role_permissions (role, module, can_create, can_read, can_update, can_delete, created_at, updated_at)
    VALUES
      ('Admin', 'transfer-windows', true, true, true, true, NOW(), NOW()),
      ('Admin', 'club-needs',       true, true, true, true, NOW(), NOW())
    ON CONFLICT DO NOTHING;
  `);
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  await queryInterface.sequelize.query(
    `DELETE FROM role_permissions WHERE module IN ('transfer-windows', 'club-needs');`,
  );
  await queryInterface.dropTable("club_needs");
  await queryInterface.removeColumn("clubs", "interest_level");
  await queryInterface.removeColumn("clubs", "last_contact_date");
  await queryInterface.removeColumn("clubs", "key_contact_phone");
  await queryInterface.removeColumn("clubs", "key_contact_email");
  await queryInterface.removeColumn("clubs", "key_contact_name");
  await queryInterface.removeColumn("clubs", "foreign_slots");
  await queryInterface.removeColumn("clubs", "budget_sar");
  await queryInterface.dropTable("transfer_windows");
}
