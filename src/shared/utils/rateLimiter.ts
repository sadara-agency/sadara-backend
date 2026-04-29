/**
 * Per-domain token bucket rate limiter.
 *
 * Each domain gets a bucket of capacity 1 (single-flight). `acquire()` waits
 * until the minimum inter-request interval has elapsed since the last request
 * to that domain, then returns. This is equivalent to a token bucket with a
 * refill rate of 1/intervalMs.
 *
 * Usage:
 *   await domainLimiter.acquire("saff.com.sa");
 *   // HTTP request here
 */

export class DomainRateLimiter {
  private readonly intervals: ReadonlyMap<string, number>;
  private readonly defaultIntervalMs: number;
  private readonly lastRequestAt = new Map<string, number>();

  constructor(
    intervals: Record<string, number>,
    defaultIntervalMs: number = 1000,
  ) {
    this.intervals = new Map(Object.entries(intervals));
    this.defaultIntervalMs = defaultIntervalMs;
  }

  acquire(domain: string): Promise<void> {
    const intervalMs = this.intervals.get(domain) ?? this.defaultIntervalMs;
    const now = Date.now();
    const last = this.lastRequestAt.get(domain) ?? 0;
    const waitMs = Math.max(0, last + intervalMs - now);

    this.lastRequestAt.set(domain, now + waitMs);

    if (waitMs === 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  /** Reset state for a domain (used in tests). */
  reset(domain?: string): void {
    if (domain) {
      this.lastRequestAt.delete(domain);
    } else {
      this.lastRequestAt.clear();
    }
  }
}
