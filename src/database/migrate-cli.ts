// migrate-cli.ts
// Usage: npx ts-node src/database/migrate-cli.ts [up|down|status] [--sync-first]

import { migrator } from "@config/migrator";
import { sequelize } from "@config/database";

const args = process.argv.slice(2);
const syncFirst = args.includes("--sync-first");
const command = args.find((a) => !a.startsWith("--")) || "up";

async function run() {
  if (syncFirst) {
    console.log("Syncing models to create core tables...");
    await sequelize.sync({ alter: false });
    console.log("Core tables synced.");
  }

  switch (command) {
    case "up":
      await migrator.up();
      console.log("All migrations applied.");
      break;

    case "down":
      await migrator.down();
      console.log("Last migration reverted.");
      break;

    case "status": {
      const executed = await migrator.executed();
      const pending = await migrator.pending();
      console.log(
        "Executed:",
        executed.map((m) => m.name),
      );
      console.log(
        "Pending:",
        pending.map((m) => m.name),
      );
      break;
    }

    default:
      console.error(`Unknown command: ${command}. Use up, down, or status.`);
      process.exit(1);
  }

  process.exit(0);
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
