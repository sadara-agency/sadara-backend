jest.mock("@config/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { createBreaker, CircuitOpenError } from "./circuitBreaker";

describe("circuitBreaker", () => {
  it("passes successful calls through and stays closed", async () => {
    const b = createBreaker({ name: "t1", failureThreshold: 3 });
    const fn = jest.fn().mockResolvedValue("ok");

    expect(await b.run(fn)).toBe("ok");
    expect(await b.run(fn)).toBe("ok");
    expect(b.state).toBe("closed");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("trips open after failureThreshold consecutive failures", async () => {
    const b = createBreaker({
      name: "t2",
      failureThreshold: 3,
      monitoringWindowMs: 30_000,
      resetTimeoutMs: 60_000,
    });
    const fn = jest.fn().mockRejectedValue(new Error("upstream 500"));

    await expect(b.run(fn)).rejects.toThrow("upstream 500");
    await expect(b.run(fn)).rejects.toThrow("upstream 500");
    expect(b.state).toBe("closed");

    await expect(b.run(fn)).rejects.toThrow("upstream 500");
    expect(b.state).toBe("open");

    // Subsequent calls short-circuit with CircuitOpenError, NOT the upstream error.
    await expect(b.run(fn)).rejects.toBeInstanceOf(CircuitOpenError);
    expect(fn).toHaveBeenCalledTimes(3); // 4th call short-circuited
  });

  it("transitions open → half-open after resetTimeoutMs and closes on success", async () => {
    jest.useFakeTimers();
    const b = createBreaker({
      name: "t3",
      failureThreshold: 2,
      resetTimeoutMs: 1_000,
    });

    const failing = jest.fn().mockRejectedValue(new Error("boom"));
    await expect(b.run(failing)).rejects.toThrow();
    await expect(b.run(failing)).rejects.toThrow();
    expect(b.state).toBe("open");

    // Inside the cooldown — still open
    jest.advanceTimersByTime(500);
    expect(b.state).toBe("open");

    // After the cooldown — half-open
    jest.advanceTimersByTime(600);
    expect(b.state).toBe("half-open");

    // A successful trial closes it
    const ok = jest.fn().mockResolvedValue("recovered");
    expect(await b.run(ok)).toBe("recovered");
    expect(b.state).toBe("closed");

    jest.useRealTimers();
  });

  it("re-opens when the half-open trial fails", async () => {
    jest.useFakeTimers();
    const b = createBreaker({
      name: "t4",
      failureThreshold: 1,
      resetTimeoutMs: 1_000,
    });

    const failing = jest.fn().mockRejectedValue(new Error("still down"));
    await expect(b.run(failing)).rejects.toThrow();
    expect(b.state).toBe("open");

    jest.advanceTimersByTime(1_100);
    expect(b.state).toBe("half-open");

    await expect(b.run(failing)).rejects.toThrow("still down");
    expect(b.state).toBe("open");

    jest.useRealTimers();
  });
});
