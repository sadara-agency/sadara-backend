import { QueryInterface, DataTypes, Op } from "sequelize";

/**
 * Migration 121
 *
 * 1. Add `saffplus_slug` to `competitions` — SAFF+ platform slug (e.g. "roshn-saudi-league").
 *    Separate from `saff_id` (integer) so both sources can coexist without constraint collision.
 *
 * 2. Add partial unique index on `matches(provider_source, external_match_id)`
 *    to support idempotent upserts from SAFF and SAFF+ scrapers.
 */

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  // 1. saffplus_slug column on competitions
  await queryInterface.addColumn("competitions", "saffplus_slug", {
    type: DataTypes.STRING(120),
    allowNull: true,
    unique: true,
  });

  // 2. Partial unique index on matches (provider_source, external_match_id)
  //    Only applies when external_match_id is not null — avoids index bloat for manual matches.
  await queryInterface.addIndex(
    "matches",
    ["provider_source", "external_match_id"],
    {
      unique: true,
      where: { external_match_id: { [Op.ne]: null } },
      name: "idx_matches_provider_external_unique",
    },
  );
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  await queryInterface.removeIndex(
    "matches",
    "idx_matches_provider_external_unique",
  );
  await queryInterface.removeColumn("competitions", "saffplus_slug");
}
