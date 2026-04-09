import { sequelize } from "@config/database";

/**
 * Migration 099: Fix club_competitions data integrity
 *
 * Problem: Many clubs are enrolled in BOTH "Roshn Saudi League" (tier 1)
 * AND "Saudi League 1st Division" (tier 2) simultaneously.
 * The Roshn Saudi League has 41 clubs when only 18 should be there.
 *
 * Fix:
 * 1. Remove non-SPL clubs from Roshn Saudi League
 * 2. Remove SPL clubs from lower-tier men's outdoor leagues
 * 3. Sync clubs.league field from actual competition enrollment
 */

export async function up() {
  const txn = await sequelize.transaction();

  try {
    // 1. Remove NON-SPL clubs from Roshn Saudi League
    // Only clubs with spl_team_id are actual Saudi Pro League teams
    await sequelize.query(
      `DELETE FROM club_competitions
       WHERE competition_id = (
         SELECT id FROM competitions WHERE name = 'Roshn Saudi League' LIMIT 1
       )
       AND club_id NOT IN (
         SELECT id FROM clubs WHERE spl_team_id IS NOT NULL
       )`,
      { transaction: txn },
    );

    // 2. For clubs IN Roshn Saudi League, remove from other men's outdoor senior leagues
    await sequelize.query(
      `DELETE FROM club_competitions
       WHERE id IN (
         SELECT cc.id
         FROM club_competitions cc
         JOIN competitions c ON c.id = cc.competition_id
         WHERE c.type = 'league'
           AND c.format = 'outdoor'
           AND c.gender = 'men'
           AND (c.age_group IS NULL OR c.age_group = '')
           AND c.name != 'Roshn Saudi League'
           AND cc.club_id IN (
             SELECT cc2.club_id
             FROM club_competitions cc2
             JOIN competitions c2 ON c2.id = cc2.competition_id
             WHERE c2.name = 'Roshn Saudi League'
               AND cc2.season = cc.season
           )
       )`,
      { transaction: txn },
    );

    // 3. Sync clubs.league field from their actual competition enrollment
    await sequelize.query(
      `UPDATE clubs
       SET league = sub.comp_name
       FROM (
         SELECT DISTINCT ON (cc.club_id) cc.club_id, c.name AS comp_name
         FROM club_competitions cc
         JOIN competitions c ON c.id = cc.competition_id
         WHERE c.type = 'league'
           AND c.format = 'outdoor'
           AND c.gender = 'men'
           AND (c.age_group IS NULL OR c.age_group = '')
         ORDER BY cc.club_id, cc.season DESC
       ) sub
       WHERE clubs.id = sub.club_id`,
      { transaction: txn },
    );

    await txn.commit();
  } catch (error) {
    await txn.rollback();
    throw error;
  }
}

export async function down() {
  // Data cleanup migration — no reliable rollback.
  // The original incorrect data can be restored from a backup if needed.
}
