import { sequelize } from "@config/database";
import { initRedis, isRedisConnected, getRedisClient } from "@config/redis";

export async function up() {
  // Update all Package C players to Package A
  await sequelize.query(
    "UPDATE players SET player_package = 'A' WHERE player_package = 'C' OR player_package IS NULL",
  );

  // Also update the column default
  await sequelize.query(
    "ALTER TABLE players ALTER COLUMN player_package SET DEFAULT 'A'",
  );

  // Flush Redis pkg cache so the middleware picks up the new values
  try {
    await initRedis();
    if (isRedisConnected()) {
      const client = getRedisClient()!;
      let cursor = "0";
      do {
        const result = await client.scan(cursor, {
          MATCH: "pkg:*",
          COUNT: 100,
        });
        cursor = String(result.cursor);
        if (result.keys.length > 0) await client.unlink(result.keys);
      } while (cursor !== "0");
    }
  } catch {
    // Redis flush is best-effort
  }
}

export async function down() {
  await sequelize.query(
    "ALTER TABLE players ALTER COLUMN player_package SET DEFAULT 'C'",
  );
}
