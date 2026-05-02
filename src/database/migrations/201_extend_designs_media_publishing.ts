import { QueryInterface, DataTypes } from "sequelize";
import { addColumnIfMissing, removeColumnIfPresent } from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  // 1. New columns
  await addColumnIfMissing(queryInterface, "designs", "platforms", {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null,
  });
  await addColumnIfMissing(queryInterface, "designs", "copy_ar", {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
  });
  await addColumnIfMissing(queryInterface, "designs", "copy_en", {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
  });
  await addColumnIfMissing(queryInterface, "designs", "media_links", {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null,
  });
  await addColumnIfMissing(queryInterface, "designs", "scheduled_at", {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
  });
  await addColumnIfMissing(queryInterface, "designs", "owner_id", {
    type: DataTypes.UUID,
    allowNull: true,
    defaultValue: null,
  });
  await addColumnIfMissing(queryInterface, "designs", "approver_id", {
    type: DataTypes.UUID,
    allowNull: true,
    defaultValue: null,
  });
  await addColumnIfMissing(queryInterface, "designs", "priority", {
    type: DataTypes.STRING(10),
    allowNull: true,
    defaultValue: null,
  });
  await addColumnIfMissing(queryInterface, "designs", "content_pillar", {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: null,
  });
  await addColumnIfMissing(queryInterface, "designs", "published_link", {
    type: DataTypes.STRING(500),
    allowNull: true,
    defaultValue: null,
  });
  await addColumnIfMissing(queryInterface, "designs", "review_notes", {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
  });
  await addColumnIfMissing(queryInterface, "designs", "event_id", {
    type: DataTypes.UUID,
    allowNull: true,
    defaultValue: null,
  });
  await addColumnIfMissing(queryInterface, "designs", "contract_id", {
    type: DataTypes.UUID,
    allowNull: true,
    defaultValue: null,
  });
  await addColumnIfMissing(queryInterface, "designs", "campaign_id", {
    type: DataTypes.UUID,
    allowNull: true,
    defaultValue: null,
  });

  // 2. Migrate existing status values to new PRD statuses
  await queryInterface.sequelize.query(
    `UPDATE designs SET status = CASE
       WHEN status = 'draft'       THEN 'Drafting'
       WHEN status = 'in_progress' THEN 'Drafting'
       WHEN status = 'review'      THEN 'PendingApproval'
       WHEN status = 'approved'    THEN 'Approved'
       WHEN status = 'published'   THEN 'Published'
       WHEN status = 'archived'    THEN 'Postponed'
       ELSE status
     END
     WHERE status IN ('draft','in_progress','review','approved','published','archived')`,
  );

  // 3. Migrate existing type values to new PRD types (graphic templates → Design)
  await queryInterface.sequelize.query(
    `UPDATE designs SET type = 'Design'
     WHERE type IN ('pre_match','post_match','profile_card','match_day_poster','social_post','motm','quote','milestone')`,
  );

  // 4. Add FK for owner_id and approver_id (guarded)
  const [tableRows] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users'`,
  );
  if ((tableRows as unknown[]).length > 0) {
    const [ownerFkRows] = await queryInterface.sequelize.query(
      `SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='designs_owner_id_fkey'`,
    );
    if ((ownerFkRows as unknown[]).length === 0) {
      await queryInterface.addConstraint("designs", {
        type: "foreign key",
        fields: ["owner_id"],
        name: "designs_owner_id_fkey",
        references: { table: "users", field: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
    }
    const [approverFkRows] = await queryInterface.sequelize.query(
      `SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='designs_approver_id_fkey'`,
    );
    if ((approverFkRows as unknown[]).length === 0) {
      await queryInterface.addConstraint("designs", {
        type: "foreign key",
        fields: ["approver_id"],
        name: "designs_approver_id_fkey",
        references: { table: "users", field: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
    }
  }

  // 5. Index on scheduled_at for the Late Publishing cron query
  const [idxRows] = await queryInterface.sequelize.query(
    `SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_designs_scheduled_at'`,
  );
  if ((idxRows as unknown[]).length === 0) {
    await queryInterface.addIndex("designs", ["scheduled_at"], {
      name: "idx_designs_scheduled_at",
    });
  }
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  // Reverse status migration back to legacy values (best-effort)
  await queryInterface.sequelize.query(
    `UPDATE designs SET status = CASE
       WHEN status = 'Drafting'        THEN 'draft'
       WHEN status = 'DesignNeeded'    THEN 'in_progress'
       WHEN status = 'PendingApproval' THEN 'review'
       WHEN status = 'Approved'        THEN 'approved'
       WHEN status = 'Scheduled'       THEN 'approved'
       WHEN status = 'Published'       THEN 'published'
       WHEN status = 'Postponed'       THEN 'archived'
       WHEN status = 'Rejected'        THEN 'archived'
       WHEN status = 'Idea'            THEN 'draft'
       ELSE status
     END`,
  );

  await queryInterface.sequelize.query(
    `UPDATE designs SET type = 'social_post' WHERE type IN ('Tweet','InstagramPost','Story','Reel','Video','PlayerAnnouncement','News','Thread','Design')`,
  );

  const cols = [
    "platforms",
    "copy_ar",
    "copy_en",
    "media_links",
    "scheduled_at",
    "owner_id",
    "approver_id",
    "priority",
    "content_pillar",
    "published_link",
    "review_notes",
    "event_id",
    "contract_id",
    "campaign_id",
  ];
  for (const col of cols) {
    await removeColumnIfPresent(queryInterface, "designs", col);
  }
}
