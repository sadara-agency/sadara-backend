/// <reference types="jest" />

// Force Supabase mode and stub the client layer used by storage.ts
jest.mock("../../../src/config/env", () => ({
  env: {
    supabase: {
      url: "https://x.supabase.co",
      serviceRoleKey: "k",
      bucket: "sadara-uploads",
    },
  },
}));

jest.mock("../../../src/config/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock("../../../src/shared/utils/supabaseStorage", () => ({
  USE_SUPABASE: true,
  getSupabase: jest.fn(),
  publicUrlForKey: (key: string) =>
    `https://x.supabase.co/storage/v1/object/public/sadara-uploads/${key}`,
}));

import { resolveFileUrl, isStorageKey } from "../../../src/shared/utils/storage";

describe("resolveFileUrl", () => {
  it("returns empty input unchanged", async () => {
    expect(await resolveFileUrl("")).toBe("");
  });

  it("passes through a full http URL (legacy GCS / external)", async () => {
    const u = "https://storage.googleapis.com/sadara-uploads/photos/a.webp";
    expect(await resolveFileUrl(u)).toBe(u);
  });

  it("passes through a local /uploads/ path", async () => {
    expect(await resolveFileUrl("/uploads/photos/a.webp")).toBe(
      "/uploads/photos/a.webp",
    );
  });

  it("builds the Supabase public URL for a bare key", async () => {
    expect(await resolveFileUrl("photos/a.webp")).toBe(
      "https://x.supabase.co/storage/v1/object/public/sadara-uploads/photos/a.webp",
    );
  });
});

describe("isStorageKey", () => {
  it("is false for empty, http URLs, and local paths", () => {
    expect(isStorageKey("")).toBe(false);
    expect(isStorageKey("https://storage.googleapis.com/x/y.pdf")).toBe(false);
    expect(isStorageKey("/uploads/documents/y.pdf")).toBe(false);
  });

  it("is true for a bare storage key", () => {
    expect(isStorageKey("documents/y.pdf")).toBe(true);
  });
});
