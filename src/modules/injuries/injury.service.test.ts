jest.mock("@config/database", () => ({
  transaction: jest.fn(async (cb: (t: unknown) => Promise<unknown>) => cb({})),
  sequelize: {},
}));

jest.mock("@config/logger", () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock("@modules/injuries/injury.model", () => ({
  Injury: { findByPk: jest.fn(), count: jest.fn() },
  InjuryUpdate: { create: jest.fn() },
}));

jest.mock("@modules/referrals/referral.model", () => ({
  Referral: { findOne: jest.fn() },
}));

jest.mock("@modules/players/player.model", () => ({
  Player: { findByPk: jest.fn(), update: jest.fn() },
}));

jest.mock("@modules/matches/match.model", () => ({ Match: {} }));
jest.mock("@modules/notifications/notification.service", () => ({
  notifyByRole: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@modules/injuries/injuryAutoTasks", () => ({
  generateCriticalInjuryTask: jest.fn().mockResolvedValue(undefined),
  generateInjuryUpdateMediaTask: jest.fn().mockResolvedValue(undefined),
  generateReturnFromInjuryMediaTask: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@modules/injuries/injuryAutoReferral", () => ({
  generateAutoReferralForInjury: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@shared/utils/audit", () => ({ logAudit: jest.fn() }));
jest.mock("@shared/utils/serviceHelpers", () => ({
  findOrThrow: jest.fn(),
  destroyById: jest.fn(),
  buildDateRange: jest.fn(),
}));
jest.mock("@shared/utils/displayId", () => ({
  generateDisplayId: jest.fn().mockResolvedValue("INJ-001"),
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

import { updateInjury } from "@modules/injuries/injury.service";
import { Injury } from "@modules/injuries/injury.model";
import { Referral } from "@modules/referrals/referral.model";
import { findOrThrow } from "@shared/utils/serviceHelpers";

describe("updateInjury — transaction rollback", () => {
  it("propagates referral sync failure so the transaction rolls back", async () => {
    const injuryUpdate = jest.fn().mockResolvedValue({ id: "inj-1" });
    (findOrThrow as jest.Mock).mockResolvedValue({
      id: "inj-1",
      playerId: "player-1",
      update: injuryUpdate,
    });

    const referralUpdate = jest
      .fn()
      .mockRejectedValue(new Error("referral DB down"));
    (Referral.findOne as jest.Mock).mockResolvedValue({
      status: "Open",
      closedAt: null,
      update: referralUpdate,
    });

    await expect(
      updateInjury("inj-1", { status: "Recovered" } as any),
    ).rejects.toThrow("referral DB down");

    expect(injuryUpdate).toHaveBeenCalledTimes(1);
    expect(referralUpdate).toHaveBeenCalledTimes(1);
    // findByPk for post-transaction reload must NOT have been called —
    // the throw aborts before getInjuryById runs.
    expect(Injury.findByPk).not.toHaveBeenCalled();
  });
});
