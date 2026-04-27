// ─────────────────────────────────────────────────────────────
// src/database/migrations/166_create_analyst_views.ts
//
// Creates the analyst_views table backing the Analyst Portal MVP-1
// "saved views" feature. A view captures the URL search-param state
// of any analyst page so the analyst can replay it later. Persona
// scopes the view to one of the four PRD personas (Performance,
// Data, Scouting, Commercial).
//
// No FK to users — `owner_user_id` is recorded for ownership but the
// users table may not exist on a fresh CI database when this runs
// (per the 000_baseline fresh-DB rule).
// ─────────────────────────────────────────────────────────────
import { QueryInterface, DataTypes, QueryTypes } from "sequelize";

async function tableExists(
  queryInterface: QueryInterface,
  table: string,
): Promise<boolean> {
  const [row] = await queryInterface.sequelize.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1
     ) AS exists`,
    { type: QueryTypes.SELECT, bind: [table] },
  );
  return row?.exists === true;
}

async function indexExists(
  queryInterface: QueryInterface,
  indexName: string,
): Promise<boolean> {
  const [row] = await queryInterface.sequelize.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM pg_indexes
       WHERE schemaname = 'public' AND indexname = $1
     ) AS exists`,
    { type: QueryTypes.SELECT, bind: [indexName] },
  );
  return row?.exists === true;
}

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  if (!(await tableExists(queryInterface, "analyst_views"))) {
    await queryInterface.createTable("analyst_views", {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      owner_user_id: {
        type: DataTypes.UUID,
        allowNull: false,
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
      route_path: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      params_json: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      is_pinned: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_shared: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      share_scope: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "private",
      },
      shared_role_ids: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      last_viewed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      view_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });
  }

  if (!(await indexExists(queryInterface, "analyst_views_owner_persona_idx"))) {
    await queryInterface.addIndex(
      "analyst_views",
      ["owner_user_id", "persona", "is_pinned"],
      { name: "analyst_views_owner_persona_idx" },
    );
  }

  if (
    !(await indexExists(queryInterface, "analyst_views_shared_persona_idx"))
  ) {
    await queryInterface.addIndex("analyst_views", ["is_shared", "persona"], {
      name: "analyst_views_shared_persona_idx",
    });
  }
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  if (await indexExists(queryInterface, "analyst_views_shared_persona_idx")) {
    await queryInterface.removeIndex(
      "analyst_views",
      "analyst_views_shared_persona_idx",
    );
  }
  if (await indexExists(queryInterface, "analyst_views_owner_persona_idx")) {
    await queryInterface.removeIndex(
      "analyst_views",
      "analyst_views_owner_persona_idx",
    );
  }
  if (await tableExists(queryInterface, "analyst_views")) {
    await queryInterface.dropTable("analyst_views");
  }
}
