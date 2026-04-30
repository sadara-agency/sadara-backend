/**
 * Safe upload path resolution for serving files from the local /uploads tree.
 *
 * Defends against:
 *   - directory traversal in the filename component (`../../etc/passwd`)
 *   - absolute path injection (`/etc/passwd`)
 *   - extension whitelist bypass
 *   - root-containment escape (resolved path outside the expected subdir)
 *
 * Returns the absolute filesystem path on success, or `null` if the input
 * is unsafe / disallowed. Callers should treat `null` as a 400 Bad Request.
 */
import path from "path";

export function safeUploadPath(
  root: string,
  subdir: string,
  rawFilename: string,
  allowedExts: readonly string[],
): string | null {
  if (typeof rawFilename !== "string" || rawFilename.length === 0) return null;

  // Strip any path components — only the basename is allowed.
  const filename = path.basename(rawFilename);
  if (filename !== rawFilename) return null;

  // Reject hidden files / empty / pure-extension inputs.
  if (filename.startsWith(".") || filename.includes("\0")) return null;

  const ext = path.extname(filename).toLowerCase();
  if (!allowedExts.includes(ext)) return null;

  const expectedRoot = path.resolve(root, subdir);
  const resolved = path.resolve(expectedRoot, filename);
  if (resolved !== path.join(expectedRoot, filename)) return null;
  if (!resolved.startsWith(expectedRoot + path.sep)) return null;

  return resolved;
}
