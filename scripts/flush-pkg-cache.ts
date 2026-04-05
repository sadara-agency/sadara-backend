import { initRedis } from "@config/redis";
import { invalidateByPrefix } from "@shared/utils/cache";

async function main() {
  await initRedis();
  const count = await invalidateByPrefix("pkg:");
  console.log(`Flushed ${count} pkg: cache entries`);
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error("Failed:", err);
  process.exit(1);
});
