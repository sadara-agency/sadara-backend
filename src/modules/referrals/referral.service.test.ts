jest.mock("@config/database", () => ({
  transaction: jest.fn(async (cb: (t: unknown) => Promise<unknown>) => cb({})),
  sequelize: {},
}));

jest.mock("@config/logger", () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock("@modules/referrals/referral.model", () => ({
  Referral: { findByPk: jest.fn(), findOne: jest.fn(), findAll: jest.fn() },
}));

jest.mock("@modules/injuries/injury.model", () => ({
  Injury: { findByPk: jest.fn(), count: jest.fn() },
}));

jest.mock("@modules/players/player.model", () => ({
  Player: { findByPk: jest.fn(), update: jest.fn() },
}));

jest.mock("@modules/users/user.model", () => ({
  User: { findOne: jest.fn() },
}));
jest.mock("@modules/sessions/session.model", () => ({ Session: {} }));
jest.mock("@modules/tickets/ticket.model", () => ({ Ticket: {} }));
jest.mock("@modules/notifications/notification.service", () => ({
  notifyByRole: jest.fn().mockResolvedValue(undefined),
  notifyUser: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@modules/referrals/referralAutoTasks", () => ({
  generateCriticalReferralTask: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@shared/utils/audit", () => ({ logAudit: jest.fn() }));
jest.mock("@shared/utils/serviceHelpers", () => ({
  findOrThrow: jest.fn(),
}));
jest.mock("@shared/utils/displayId", () => ({
  generateDisplayId: jest.fn().mockResolvedValue("REF-001"),
}));
jest.mock("@shared/utils/rowScope", () => ({
  buildRowScope: jest.fn(),
  mergeScope: jest.fn(),
  checkRowAccess: jest.fn().mockResolvedValue(true),
}));
jest.mock("@shared/utils/pagination", () => ({
  parsePagination: jest.fn(),
  buildMeta: jest.fn(),
}));

jest.mock("@modules/calendar/calendarScope", () => ({
  upsertSourceAttendees: jest.fn(),
  evictCalendarScope: jest.fn().mockResolvedValue(undefined),
}));

import { updateReferralStatus } from "@modules/referrals/referral.service";
import { Referral } from "@modules/referrals/referral.model";
import { Injury } from "@modules/injuries/injury.model";

describe("updateReferralStatus — transaction rollback", () => {
  it("propagates injury sync failure so the transaction rolls back", async () => {
    const referralUpdate = jest.fn().mockResolvedValue(undefined);
    (Referral.findByPk as jest.Mock).mockResolvedValueOnce({
      id: "ref-1",
      status: "Open",
      playerId: "player-1",
      injuryId: "inj-1",
      get: () => null,
      update: referralUpdate,
    });

    const injuryUpdate = jest
      .fn()
      .mockRejectedValue(new Error("injury DB down"));
    (Injury.findByPk as jest.Mock).mockResolvedValue({
      status: "UnderTreatment",
      update: injuryUpdate,
    });

    await expect(
      updateReferralStatus("ref-1", { status: "Closed" }),
    ).rejects.toThrow("injury DB down");

    expect(referralUpdate).toHaveBeenCalledTimes(1);
    expect(injuryUpdate).toHaveBeenCalledTimes(1);
  });
});
