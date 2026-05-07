jest.mock("@modules/users/user.model", () => ({
  User: {
    init: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    name: "User",
  },
}));
jest.mock("@modules/tasks/task.service", () => ({
  createTask: jest.fn().mockResolvedValue({ id: "task-1" }),
}));
jest.mock("@config/logger", () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

import { User } from "@modules/users/user.model";
import { createTask } from "@modules/tasks/task.service";
import { createManagerProfileTasks } from "./scoutingAutoTasks";

const ARGS = {
  decisionId: "decision-1",
  recordedBy: "user-1",
  prospectName: "Mohammed Salah",
  prospectNameAr: "محمد صلاح",
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("createManagerProfileTasks", () => {
  it("creates one task per active Manager", async () => {
    (User.findAll as jest.Mock).mockResolvedValue([
      { id: "mgr-1" },
      { id: "mgr-2" },
      { id: "mgr-3" },
    ]);

    await createManagerProfileTasks(ARGS);

    expect(createTask).toHaveBeenCalledTimes(3);
    const assignees = (createTask as jest.Mock).mock.calls.map(
      (c) => c[0].assignedTo,
    );
    expect(assignees.sort()).toEqual(["mgr-1", "mgr-2", "mgr-3"]);
  });

  it("tags each task with the sourceDecisionId for sibling auto-cancel", async () => {
    (User.findAll as jest.Mock).mockResolvedValue([{ id: "mgr-1" }]);

    await createManagerProfileTasks(ARGS);

    const payload = (createTask as jest.Mock).mock.calls[0][0];
    expect(payload.sourceDecisionId).toBe("decision-1");
    expect(payload.isAutoCreated).toBe(true);
    expect(payload.priority).toBe("high");
    expect(payload.type).toBe("General");
    expect(payload.title).toContain("Mohammed Salah");
    expect(payload.titleAr).toContain("محمد صلاح");
  });

  it("queries only active Managers", async () => {
    (User.findAll as jest.Mock).mockResolvedValue([]);

    await createManagerProfileTasks(ARGS);

    const where = (User.findAll as jest.Mock).mock.calls[0][0].where;
    expect(where.role).toBe("Manager");
    expect(where.isActive).toBe(true);
  });

  it("no-ops cleanly when there are no active Managers", async () => {
    (User.findAll as jest.Mock).mockResolvedValue([]);

    await createManagerProfileTasks(ARGS);

    expect(createTask).not.toHaveBeenCalled();
  });

  it("swallows per-task failures so one bad manager doesn't block the others", async () => {
    (User.findAll as jest.Mock).mockResolvedValue([
      { id: "mgr-1" },
      { id: "mgr-2" },
    ]);
    (createTask as jest.Mock)
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ id: "task-2" });

    await expect(createManagerProfileTasks(ARGS)).resolves.toBeUndefined();
    expect(createTask).toHaveBeenCalledTimes(2);
  });
});
