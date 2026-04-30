/**
 * Outbound URL guard for backend HTTP fetches that take user / DB-influenced URLs.
 *
 * Defends against SSRF by enforcing:
 *   - scheme is `https:` (no http:, file:, gopher:, data:, etc.)
 *   - host literally matches an allowlisted host or one of its allowed subdomains
 *   - host is not an IP literal pointing at private / loopback / link-local space
 *
 * Note: this does NOT do DNS resolution — that's a deeper rebinding-class
 * problem that needs a custom http agent to address properly. The host
 * allowlist already eliminates the realistic attack surface here, since
 * an attacker can only pick from a small fixed set of public hosts.
 *
 * Throws AppError(400) on rejection. Returns the parsed URL on success.
 */
import { AppError } from "@middleware/errorHandler";

const PRIVATE_IPV4_RANGES: Array<(parts: number[]) => boolean> = [
  (p) => p[0] === 10,
  (p) => p[0] === 127,
  (p) => p[0] === 169 && p[1] === 254,
  (p) => p[0] === 172 && p[1] >= 16 && p[1] <= 31,
  (p) => p[0] === 192 && p[1] === 168,
  (p) => p[0] === 0,
  (p) => p[0] >= 224, // multicast + reserved
];

function isPrivateIpv4(host: string): boolean {
  const parts = host.split(".").map((s) => Number(s));
  if (
    parts.length !== 4 ||
    parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)
  ) {
    return false;
  }
  return PRIVATE_IPV4_RANGES.some((fn) => fn(parts));
}

function isPrivateIpv6(host: string): boolean {
  // host arrives without brackets when read from URL.hostname
  const lower = host.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fe80:")) return true; // link-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // ULA
  return false;
}

function hostAllowed(
  hostname: string,
  allowedHosts: readonly string[],
): boolean {
  const h = hostname.toLowerCase();
  return allowedHosts.some((allowed) => {
    const a = allowed.toLowerCase();
    if (a.startsWith("*.")) {
      const suffix = a.slice(1); // ".example.com"
      return h.endsWith(suffix) && h.length > suffix.length;
    }
    return h === a;
  });
}

export function assertSafeOutboundUrl(
  raw: string,
  allowedHosts: readonly string[],
): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new AppError("Invalid outbound URL", 400);
  }
  if (url.protocol !== "https:") {
    throw new AppError("Outbound URL must use https", 400);
  }
  // url.hostname returns IPv6 literals wrapped in brackets — strip for the
  // numeric range check so addresses like "[::1]" still match the loopback rule.
  const hostname = url.hostname;
  const ipv6Inner =
    hostname.startsWith("[") && hostname.endsWith("]")
      ? hostname.slice(1, -1)
      : hostname;
  if (isPrivateIpv4(hostname) || isPrivateIpv6(ipv6Inner)) {
    throw new AppError("Outbound URL points to a private address", 400);
  }
  if (!hostAllowed(hostname, allowedHosts)) {
    throw new AppError("Outbound URL host is not allowed", 400);
  }
  return url;
}
