/**
 * Hand-rolled circuit breaker for outbound integrations (SAFF, SPL, etc).
 *
 * States:
 *   - closed     — calls pass through; failures accumulate within a sliding window
 *   - open       — calls short-circuit with CircuitOpenError; auto-transitions to
 *                  half-open after resetTimeoutMs
 *   - half-open  — exactly one trial call is allowed; success → closed, failure → open
 *
 * Why hand-rolled (vs `opossum`): the integrations only need ~50 lines of logic
 * and zero new dependencies. Swap to opossum later if richer features (event
 * emitter, fallback functions, semaphore concurrency) are needed.
 */

import { logger } from "@config/logger";

export class CircuitOpenError extends Error {
  public readonly breakerName: string;

  constructor(name: string) {
    super(`[CircuitBreaker:${name}] open — call short-circuited`);
    this.name = "CircuitOpenError";
    this.breakerName = name;
  }
}

export type BreakerState = "closed" | "open" | "half-open";

export interface BreakerOptions {
  name: string;
  /** Trip after this many failures within monitoringWindowMs (default 5). */
  failureThreshold?: number;
  /** Sliding window for counting failures (default 30 s). */
  monitoringWindowMs?: number;
  /** Time the breaker stays open before allowing a half-open trial (default 60 s). */
  resetTimeoutMs?: number;
}

export interface Breaker {
  readonly name: string;
  readonly state: BreakerState;
  run<T>(fn: () => Promise<T>): Promise<T>;
  /** Test-only: clear failures + force-close. Production code should never call this. */
  reset(): void;
}

export function createBreaker(opts: BreakerOptions): Breaker {
  const failureThreshold = opts.failureThreshold ?? 5;
  const monitoringWindowMs = opts.monitoringWindowMs ?? 30_000;
  const resetTimeoutMs = opts.resetTimeoutMs ?? 60_000;

  let state: BreakerState = "closed";
  let failureTimestamps: number[] = [];
  let openedAt = 0;

  function recordFailure(now: number) {
    const cutoff = now - monitoringWindowMs;
    failureTimestamps = failureTimestamps.filter((t) => t >= cutoff);
    failureTimestamps.push(now);
    if (state === "closed" && failureTimestamps.length >= failureThreshold) {
      state = "open";
      openedAt = now;
      logger.error(
        `[CircuitBreaker:${opts.name}] tripped open after ${failureTimestamps.length} failures in ${monitoringWindowMs}ms`,
      );
    }
  }

  function recordSuccess() {
    if (state === "half-open" || state === "open") {
      logger.info(
        `[CircuitBreaker:${opts.name}] closed after successful trial`,
      );
    }
    state = "closed";
    failureTimestamps = [];
    openedAt = 0;
  }

  return {
    name: opts.name,
    get state() {
      // Lazily transition open → half-open once cooldown elapses.
      if (state === "open" && Date.now() - openedAt >= resetTimeoutMs) {
        state = "half-open";
      }
      return state;
    },
    async run<T>(fn: () => Promise<T>): Promise<T> {
      const now = Date.now();
      if (state === "open" && now - openedAt < resetTimeoutMs) {
        throw new CircuitOpenError(opts.name);
      }
      if (state === "open") state = "half-open";

      try {
        const result = await fn();
        recordSuccess();
        return result;
      } catch (err) {
        if (state === "half-open") {
          // Trial failed → re-open.
          state = "open";
          openedAt = Date.now();
          failureTimestamps = [Date.now()];
          logger.error(
            `[CircuitBreaker:${opts.name}] half-open trial failed — re-opening`,
          );
        } else {
          recordFailure(Date.now());
        }
        throw err;
      }
    },
    reset() {
      state = "closed";
      failureTimestamps = [];
      openedAt = 0;
    },
  };
}
