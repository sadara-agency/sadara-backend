import { sequelize } from "@config/database";

async function main() {
  await sequelize.authenticate();
  console.log("Connected to DB");

  const [, meta] = await sequelize.query(
    "UPDATE players SET player_package = 'A' WHERE player_package != 'A' OR player_package IS NULL",
  );

  console.log(`Updated players to Package A (affected: ${(meta as any)?.rowCount ?? "unknown"})`);
  await sequelize.close();
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error("Failed:", err);
  process.exit(1);
});
