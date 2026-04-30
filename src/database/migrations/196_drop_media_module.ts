import { QueryInterface } from "sequelize";
import { tableExists } from "../migrationHelpers";

const TABLES_TO_DROP = [
  "social_media_accounts",
  "social_media_posts",
  "media_kit_generations",
  "press_releases",
  "media_contacts",
  "media_requests",
];

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  // CASCADE: these tables form an interconnected media-module subgraph
  // (e.g. media_requests.media_contact_id → media_contacts) and are all
  // being retired together. Dropping with CASCADE removes dependent FKs
  // without needing to enumerate the constraint graph by hand.
  for (const table of TABLES_TO_DROP) {
    if (await tableExists(queryInterface, table)) {
      await queryInterface.sequelize.query(
        `DROP TABLE IF EXISTS "${table}" CASCADE`,
      );
    }
  }
}

export async function down(_args: { context: QueryInterface }) {
  // Irreversible: legacy media module retired in favour of new graphic designer
  // module (see plan/PLAN.md). Recreating the dropped tables is out of scope.
}
