import { sequelize } from "@config/database";
import { QueryTypes } from "sequelize";

export async function up() {
  // Discover the actual enum type name for players.player_type
  // (Sequelize creates it as enum_players_player_type, but older DBs may use player_type)
  const [row] = await sequelize.query<{ typname: string }>(
    `SELECT t.typname FROM pg_type t
     JOIN pg_attribute a ON a.atttypid = t.oid
     JOIN pg_class c ON a.attrelid = c.oid
     WHERE c.relname = 'players' AND a.attname = 'player_type' AND t.typtype = 'e'`,
    { type: QueryTypes.SELECT },
  );

  if (!row) return;

  await sequelize.query(
    `ALTER TYPE "${row.typname}" ADD VALUE IF NOT EXISTS 'Amateur'`,
  );
}

export async function down() {
  // PostgreSQL does not support removing enum values directly
}
