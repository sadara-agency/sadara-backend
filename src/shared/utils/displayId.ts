import { sequelize } from "@config/database";
import { QueryTypes } from "sequelize";

/** Entity-to-prefix mapping for display ID generation. */
const ENTITY_PREFIX: Record<string, string> = {
  players: "P",
  contracts: "CON",
  offers: "OFR",
  matches: "MTH",
  referrals: "TKT",
  invoices: "INV",
  sessions: "SES",
};

/**
 * Generate a human-readable display ID for an entity.
 *
 * Format: PREFIX-YY-NNNN (e.g. P-26-0001)
 * Uses an atomic upsert on `display_id_sequences` to guarantee uniqueness
 * even under concurrent inserts.
 */
export async function generateDisplayId(entity: string): Promise<string> {
  const prefix = ENTITY_PREFIX[entity];
  if (!prefix) {
    throw new Error(`Unknown entity for display ID: ${entity}`);
  }

  const year = new Date().getFullYear();
  const yy = year % 100;

  const [result] = await sequelize.query<{ next_val: number }>(
    `INSERT INTO display_id_sequences (entity, year, next_val)
     VALUES (:entity, :year, 1)
     ON CONFLICT (entity, year)
     DO UPDATE SET next_val = display_id_sequences.next_val + 1
     RETURNING next_val`,
    {
      replacements: { entity, year },
      type: QueryTypes.SELECT,
    },
  );

  const seq = String(result.next_val).padStart(4, "0");
  return `${prefix}-${yy}-${seq}`;
}
