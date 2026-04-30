jest.mock("@middleware/errorHandler", () => ({
  AppError: class extends Error {
    public statusCode: number;
    constructor(msg: string, statusCode: number) {
      super(msg);
      this.statusCode = statusCode;
    }
  },
}));

import { assertSafeOutboundUrl } from "./safeOutboundUrl";

const ALLOWED = ["storage.googleapis.com", "*.example.com"] as const;

describe("assertSafeOutboundUrl", () => {
  it("accepts an https URL on an allowlisted exact host", () => {
    const url = assertSafeOutboundUrl(
      "https://storage.googleapis.com/bucket/foo.pdf",
      ALLOWED,
    );
    expect(url.hostname).toBe("storage.googleapis.com");
  });

  it("accepts a subdomain when allowlist uses *.suffix", () => {
    const url = assertSafeOutboundUrl("https://api.example.com/x", ALLOWED);
    expect(url.hostname).toBe("api.example.com");
  });

  it("rejects http://", () => {
    expect(() =>
      assertSafeOutboundUrl("http://storage.googleapis.com/x", ALLOWED),
    ).toThrow(/https/);
  });

  it("rejects file:// and gopher://", () => {
    expect(() =>
      assertSafeOutboundUrl("file:///etc/passwd", ALLOWED),
    ).toThrow();
    expect(() =>
      assertSafeOutboundUrl("gopher://x.example.com/", ALLOWED),
    ).toThrow();
  });

  it("rejects hosts outside the allowlist", () => {
    expect(() =>
      assertSafeOutboundUrl("https://attacker.com/", ALLOWED),
    ).toThrow(/not allowed/);
  });

  it("rejects the allowlist's bare apex when only *.suffix is allowed", () => {
    expect(() =>
      assertSafeOutboundUrl("https://example.com/", ALLOWED),
    ).toThrow(/not allowed/);
  });

  it("rejects RFC1918 IPv4 hosts", () => {
    const cases = [
      "https://10.0.0.1/",
      "https://192.168.1.1/",
      "https://172.16.0.1/",
      "https://127.0.0.1/",
      "https://169.254.169.254/", // cloud metadata
    ];
    for (const c of cases) {
      expect(() =>
        assertSafeOutboundUrl(c, [
          "10.0.0.1",
          "192.168.1.1",
          "172.16.0.1",
          "127.0.0.1",
          "169.254.169.254",
        ]),
      ).toThrow(/private/);
    }
  });

  it("rejects IPv6 loopback and link-local", () => {
    expect(() => assertSafeOutboundUrl("https://[::1]/", ["::1"])).toThrow(
      /private/,
    );
    expect(() =>
      assertSafeOutboundUrl("https://[fe80::1]/", ["fe80::1"]),
    ).toThrow(/private/);
  });

  it("rejects a malformed URL", () => {
    expect(() => assertSafeOutboundUrl("not a url", ALLOWED)).toThrow(
      /Invalid/,
    );
  });
});
