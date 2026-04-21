import { Op } from "sequelize";
import { Offer } from "@modules/offers/offer.model";
import { Player } from "@modules/players/player.model";
import { Club } from "@modules/clubs/club.model";
import { AppError } from "@middleware/errorHandler";
import { generateDisplayId } from "@shared/utils/displayId";

interface ImportRow {
  playerName?: string;
  toClub?: string;
  offerType?: string;
  phase?: string;
  transferFee?: string;
  windowId?: string;
}

const VALID_PHASES = ["ID", "Acquire", "Map", "Negotiate", "Media", "Close"];
const VALID_TYPES = ["Transfer", "Loan"];

export async function importOffersFromCsv(
  rows: ImportRow[],
  createdBy: string,
): Promise<number> {
  const validRows = rows.filter((r) => r.playerName && r.toClub);
  if (!validRows.length)
    throw new AppError("No valid rows in import file", 422);

  // Bulk-fetch players matching any of the names
  const playerNames = [...new Set(validRows.map((r) => r.playerName!.trim()))];
  const players = await Player.findAll({
    where: {
      [Op.or]: playerNames.map((name) => {
        const [first, ...rest] = name.split(" ");
        return {
          firstName: { [Op.iLike]: first },
          lastName: { [Op.iLike]: rest.join(" ") || "%" },
        };
      }),
    },
    attributes: ["id", "firstName", "lastName"],
  });

  const playerMap = new Map<string, string>();
  for (const p of players) {
    const key = `${p.firstName} ${p.lastName}`.toLowerCase().trim();
    playerMap.set(key, p.id);
  }

  // Bulk-fetch clubs
  const clubNames = [...new Set(validRows.map((r) => r.toClub!.trim()))];
  const clubs = await Club.findAll({
    where: {
      name: { [Op.iLike]: { [Op.any]: clubNames } as unknown as string },
    },
    attributes: ["id", "name"],
  });

  const clubMap = new Map<string, string>();
  for (const c of clubs) {
    clubMap.set(c.name.toLowerCase().trim(), c.id);
  }

  // Build records — only include rows with resolved playerId
  const records: Record<string, unknown>[] = [];

  for (const r of validRows) {
    const playerKey = r.playerName!.trim().toLowerCase();
    const playerId = playerMap.get(playerKey);
    if (!playerId) continue; // skip rows without a matched player

    const clubKey = r.toClub!.trim().toLowerCase();
    const toClubId = clubMap.get(clubKey) ?? null;

    const displayId = await generateDisplayId("offers");
    records.push({
      playerId,
      toClubId: toClubId ?? undefined,
      offerType: VALID_TYPES.includes(r.offerType ?? "")
        ? (r.offerType as "Transfer" | "Loan")
        : "Transfer",
      phase: VALID_PHASES.includes(r.phase ?? "") ? r.phase : null,
      transferFee: r.transferFee ? Number(r.transferFee) : null,
      windowId: r.windowId || null,
      status: "New",
      createdBy,
      displayId,
    });
  }

  if (!records.length)
    throw new AppError("No rows could be matched to existing players", 422);

  await Offer.bulkCreate(records as any); // OfferCreationAttributes not exported from model
  return records.length;
}
