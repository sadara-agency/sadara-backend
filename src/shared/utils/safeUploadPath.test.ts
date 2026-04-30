import path from "path";
import { safeUploadPath } from "./safeUploadPath";

const ROOT = path.resolve("/tmp/uploads-test");
const SUB = "documents";
const EXTS = [".pdf", ".png"] as const;

describe("safeUploadPath", () => {
  it("returns absolute path for a clean filename", () => {
    const result = safeUploadPath(ROOT, SUB, "report.pdf", EXTS);
    expect(result).toBe(path.resolve(ROOT, SUB, "report.pdf"));
  });

  it("rejects directory traversal attempts", () => {
    expect(safeUploadPath(ROOT, SUB, "../etc/passwd", EXTS)).toBeNull();
    expect(safeUploadPath(ROOT, SUB, "../../secret.pdf", EXTS)).toBeNull();
    expect(safeUploadPath(ROOT, SUB, "foo/bar.pdf", EXTS)).toBeNull();
  });

  it("rejects absolute path injection", () => {
    expect(safeUploadPath(ROOT, SUB, "/etc/passwd", EXTS)).toBeNull();
  });

  it("rejects disallowed extensions", () => {
    expect(safeUploadPath(ROOT, SUB, "evil.exe", EXTS)).toBeNull();
    expect(safeUploadPath(ROOT, SUB, "noext", EXTS)).toBeNull();
  });

  it("rejects hidden / null-byte / empty filenames", () => {
    expect(safeUploadPath(ROOT, SUB, ".secret.pdf", EXTS)).toBeNull();
    expect(safeUploadPath(ROOT, SUB, "foo\0.pdf", EXTS)).toBeNull();
    expect(safeUploadPath(ROOT, SUB, "", EXTS)).toBeNull();
  });

  it("normalizes extension casing", () => {
    expect(safeUploadPath(ROOT, SUB, "Report.PDF", EXTS)).toBe(
      path.resolve(ROOT, SUB, "Report.PDF"),
    );
  });
});
