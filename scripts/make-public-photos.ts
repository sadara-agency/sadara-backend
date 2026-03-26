/**
 * One-time script: Make existing photos and avatars publicly accessible in GCS.
 *
 * Photos and avatars uploaded before the storage fix stored files without
 * calling makePublic(), causing 403 Forbidden errors on direct GCS URLs.
 *
 * Usage:
 *   npx tsx scripts/make-public-photos.ts
 *
 * Requires GCS credentials to be configured (env vars or ADC).
 */
import { Storage } from "@google-cloud/storage";
import dotenv from "dotenv";

dotenv.config({ path: ".env.development.local" });

const BUCKET = process.env.GCS_BUCKET_NAME;
const PROJECT_ID = process.env.GCS_PROJECT_ID;
const CREDS_JSON = process.env.GCS_CREDENTIALS_JSON;
const CREDS_PATH = process.env.GCS_CREDENTIALS;

if (!BUCKET || !PROJECT_ID) {
  console.error("Missing GCS_BUCKET_NAME or GCS_PROJECT_ID env vars.");
  process.exit(1);
}

const opts: ConstructorParameters<typeof Storage>[0] = { projectId: PROJECT_ID };
if (CREDS_JSON) {
  opts.credentials = JSON.parse(CREDS_JSON);
} else if (CREDS_PATH) {
  opts.keyFilename = CREDS_PATH;
}

const storage = new Storage(opts);
const bucket = storage.bucket(BUCKET);

const PUBLIC_PREFIXES = ["photos/", "avatars/"];

async function makePublicByPrefix(prefix: string): Promise<number> {
  let count = 0;
  const [files] = await bucket.getFiles({ prefix });

  for (const file of files) {
    try {
      await file.makePublic();
      await file.setMetadata({
        cacheControl: "public, max-age=31536000, immutable",
      });
      count++;
      if (count % 50 === 0) {
        console.log(`  ${prefix}: ${count}/${files.length} done...`);
      }
    } catch (err: any) {
      console.warn(`  Failed: ${file.name} — ${err.message}`);
    }
  }

  return count;
}

async function main() {
  console.log(`Bucket: ${BUCKET}`);
  console.log(`Making objects public in: ${PUBLIC_PREFIXES.join(", ")}\n`);

  let total = 0;
  for (const prefix of PUBLIC_PREFIXES) {
    console.log(`Processing ${prefix}...`);
    const count = await makePublicByPrefix(prefix);
    console.log(`  ✓ ${count} objects made public\n`);
    total += count;
  }

  console.log(`Done. Total: ${total} objects made public.`);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
