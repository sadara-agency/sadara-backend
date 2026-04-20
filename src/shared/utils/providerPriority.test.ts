import {
  canOverwrite,
  PERFORMANCE_PRIORITY,
  MATCH_PRIORITY,
  CLUB_PRIORITY,
} from "./providerPriority";

describe("canOverwrite", () => {
  describe("null / undefined existing source", () => {
    it("allows write when existing is null", () => {
      expect(canOverwrite(null, "SPL", PERFORMANCE_PRIORITY)).toBe(true);
    });

    it("allows write when existing is undefined", () => {
      expect(canOverwrite(undefined, "PulseLive", PERFORMANCE_PRIORITY)).toBe(
        true,
      );
    });
  });

  describe("equal priority", () => {
    it("allows idempotent re-run from the same source", () => {
      expect(canOverwrite("PulseLive", "PulseLive", PERFORMANCE_PRIORITY)).toBe(
        true,
      );
    });
  });

  describe("incoming is higher priority", () => {
    it("PulseLive can overwrite SPL", () => {
      expect(canOverwrite("SPL", "PulseLive", PERFORMANCE_PRIORITY)).toBe(true);
    });

    it("SPL can overwrite SAFF", () => {
      expect(canOverwrite("SAFF", "SPL", PERFORMANCE_PRIORITY)).toBe(true);
    });
  });

  describe("incoming is lower priority — should be blocked", () => {
    it("SPL cannot overwrite PulseLive", () => {
      expect(canOverwrite("PulseLive", "SPL", PERFORMANCE_PRIORITY)).toBe(
        false,
      );
    });

    it("SAFF cannot overwrite PulseLive", () => {
      expect(canOverwrite("PulseLive", "SAFF", PERFORMANCE_PRIORITY)).toBe(
        false,
      );
    });
  });

  describe("unknown sources default to priority 0", () => {
    it("unknown incoming cannot overwrite a known source", () => {
      expect(
        canOverwrite("PulseLive", "UnknownProvider", PERFORMANCE_PRIORITY),
      ).toBe(false);
    });

    it("known source can overwrite an unknown existing source", () => {
      expect(canOverwrite("UnknownProvider", "SPL", PERFORMANCE_PRIORITY)).toBe(
        true,
      );
    });

    it("two unknown sources are treated as equal (0 >= 0)", () => {
      expect(canOverwrite("UnknownA", "UnknownB", PERFORMANCE_PRIORITY)).toBe(
        true,
      );
    });
  });
});

describe("priority maps", () => {
  it("PERFORMANCE_PRIORITY: PulseLive > SPL > SAFF", () => {
    expect(PERFORMANCE_PRIORITY.PulseLive).toBeGreaterThan(
      PERFORMANCE_PRIORITY.SPL,
    );
    expect(PERFORMANCE_PRIORITY.SPL).toBeGreaterThan(PERFORMANCE_PRIORITY.SAFF);
  });

  it("MATCH_PRIORITY: PulseLive > Sportmonks > SAFF > SAFFPlus", () => {
    expect(MATCH_PRIORITY.PulseLive).toBeGreaterThan(MATCH_PRIORITY.Sportmonks);
    expect(MATCH_PRIORITY.Sportmonks).toBeGreaterThan(MATCH_PRIORITY.SAFF);
    expect(MATCH_PRIORITY.SAFF).toBeGreaterThan(MATCH_PRIORITY.SAFFPlus);
  });

  it("CLUB_PRIORITY: PulseLive > SAFF, SPL and Sportmonks equal", () => {
    expect(CLUB_PRIORITY.PulseLive).toBeGreaterThan(CLUB_PRIORITY.SAFF);
    expect(CLUB_PRIORITY.SPL).toBe(CLUB_PRIORITY.Sportmonks);
    expect(CLUB_PRIORITY.SPL).toBeGreaterThan(CLUB_PRIORITY.SAFF);
  });
});
