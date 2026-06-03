// Migration 257: Add per-match team logo columns to matches
//
// Why: SAFF+ imported matches frequently have NULL home_club_id/away_club_id
// (the single-match import path intentionally omits club ids because the
// migration-152 CHECK constraint requires a squad_id whenever a club_id is
// set — see saff.service.ts:importSaffPlusMatch). With no joined Club there is
// no Club.logo_url to display, so the match-schedule / score-card views fall
// back to team initials even though the live SAFF+ feed carries real crests.
//
// These columns let the import/sync paths store the SAFF+ crest directly on
// the match row, so the card can render a logo for orphan matches that have no
// club (and hence no club logo) at all.

import { QueryInterface, DataTypes } from "sequelize";
import { addColumnIfMissing, removeColumnIfPresent } from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await addColumnIfMissing(queryInterface, "matches", "home_team_logo", {
    type: DataTypes.STRING(500),
    allowNull: true,
    defaultValue: null,
  });
  await addColumnIfMissing(queryInterface, "matches", "away_team_logo", {
    type: DataTypes.STRING(500),
    allowNull: true,
    defaultValue: null,
  });
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await removeColumnIfPresent(queryInterface, "matches", "home_team_logo");
  await removeColumnIfPresent(queryInterface, "matches", "away_team_logo");
}
