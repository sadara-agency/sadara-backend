jest.mock("@config/logger", () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock("@modules/mental/mental.model", () => ({
  MentalAssessment: {
    create: jest.fn(),
    findAndCountAll: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
  },
  MentalAssessmentTemplate: { findByPk: jest.fn(), findAll: jest.fn() },
}));

jest.mock("@modules/players/player.model", () => ({
  Player: { findByPk: jest.fn() },
}));

jest.mock("@modules/users/user.model", () => ({
  User: { findByPk: jest.fn() },
}));

jest.mock("@modules/notifications/notification.service", () => ({
  notifyByRole: jest.fn().mockResolvedValue(2),
}));

import { createAssessment } from "./mental.service";
import { MentalAssessmentTemplate, MentalAssessment } from "./mental.model";
import { notifyByRole } from "@modules/notifications/notification.service";

const ADMIN_USER = { id: "user-1", role: "Admin" } as any;

const TEMPLATE_BASE = {
  id: "tpl-1",
  questions: [{ type: "scale", weight: 1 }],
  scoringRanges: [
    { minScore: 0, maxScore: 5, severity: "low" },
    { minScore: 6, maxScore: 8, severity: "moderate" },
    { minScore: 9, maxScore: 10, severity: "severe" },
  ],
};

function makeAssessmentCreate(severityLevel: string) {
  const record = {
    id: "asmt-1",
    severityLevel,
    isConfidential: true,
  };
  (MentalAssessment.create as jest.Mock).mockResolvedValue(record);
  return record;
}

describe("createAssessment — crisis notification fan-out", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (MentalAssessmentTemplate.findByPk as jest.Mock).mockResolvedValue(
      TEMPLATE_BASE,
    );
  });

  it("does NOT notify for low severity", async () => {
    makeAssessmentCreate("low");

    await createAssessment(
      {
        templateId: "tpl-1",
        playerId: "p-1",
        responses: [{ questionIndex: 0, value: 3 }],
        assessmentDate: "2026-04-30",
      } as any,
      "user-1",
    );

    expect(notifyByRole).not.toHaveBeenCalled();
  });

  it("does NOT notify for moderate severity", async () => {
    makeAssessmentCreate("moderate");

    await createAssessment(
      {
        templateId: "tpl-1",
        playerId: "p-1",
        responses: [{ questionIndex: 0, value: 7 }],
        assessmentDate: "2026-04-30",
      } as any,
      "user-1",
    );

    expect(notifyByRole).not.toHaveBeenCalled();
  });

  it("fires mental_alert notification to Admin + Manager on severe severity", async () => {
    makeAssessmentCreate("severe");

    await createAssessment(
      {
        templateId: "tpl-1",
        playerId: "p-1",
        responses: [{ questionIndex: 0, value: 9 }],
        assessmentDate: "2026-04-30",
      } as any,
      "user-1",
    );

    // Allow the fire-and-forget promise to settle
    await new Promise((r) => setTimeout(r, 0));

    expect(notifyByRole).toHaveBeenCalledWith(
      ["Admin", "Manager"],
      expect.objectContaining({
        type: "mental_alert",
        priority: "high",
        sourceType: "mental",
        sourceId: "asmt-1",
      }),
    );
  });

  it("fires mental_alert notification on critical severity", async () => {
    makeAssessmentCreate("critical");

    await createAssessment(
      {
        templateId: "tpl-1",
        playerId: "p-1",
        responses: [{ questionIndex: 0, value: 10 }],
        assessmentDate: "2026-04-30",
      } as any,
      "user-1",
    );

    await new Promise((r) => setTimeout(r, 0));

    expect(notifyByRole).toHaveBeenCalledWith(
      ["Admin", "Manager"],
      expect.objectContaining({ type: "mental_alert" }),
    );
  });

  it("swallows notification errors without throwing", async () => {
    makeAssessmentCreate("severe");
    (notifyByRole as jest.Mock).mockRejectedValueOnce(new Error("DB down"));

    const result = await createAssessment(
      {
        templateId: "tpl-1",
        playerId: "p-1",
        responses: [{ questionIndex: 0, value: 9 }],
        assessmentDate: "2026-04-30",
      } as any,
      "user-1",
    );

    await new Promise((r) => setTimeout(r, 0));

    // Assessment still returned despite notification failure
    expect(result).toMatchObject({ id: "asmt-1", severityLevel: "severe" });
  });
});

describe("createAssessment — no notification when no severity computed", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (MentalAssessmentTemplate.findByPk as jest.Mock).mockResolvedValue({
      ...TEMPLATE_BASE,
      scoringRanges: [], // no ranges → severityLevel = null
    });
  });

  it("does NOT notify when severityLevel is null", async () => {
    (MentalAssessment.create as jest.Mock).mockResolvedValue({
      id: "asmt-2",
      severityLevel: null,
    });

    await createAssessment(
      {
        templateId: "tpl-1",
        playerId: "p-1",
        responses: [{ questionIndex: 0, value: 9 }],
        assessmentDate: "2026-04-30",
      } as any,
      "user-1",
    );

    await new Promise((r) => setTimeout(r, 0));
    expect(notifyByRole).not.toHaveBeenCalled();
  });
});
