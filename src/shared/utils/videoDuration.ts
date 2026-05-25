/**
 * Pure-JS video duration extraction from an in-memory buffer.
 *
 * Why not ffprobe? The upload buffer is streamed straight to GCS and never
 * touches disk, and the Cloud Run image has no ffprobe binary. This reads the
 * duration directly out of the container header:
 *   - MP4 / MOV / M4V  → the `mvhd` atom (movie header)
 *   - WebM / Matroska  → the EBML `Duration` element (0x4489) + `TimecodeScale`
 *
 * Returns whole seconds, or null if the format isn't recognised or the header
 * isn't present in the buffer. Best-effort: never throws.
 */

/** MP4/MOV: find the `mvhd` atom and read its duration / timescale. */
function parseMp4Duration(buf: Buffer): number | null {
  const needle = Buffer.from("mvhd");
  const idx = buf.indexOf(needle);
  if (idx < 0) return null;

  // mvhd layout after the 4-char type: version(1) flags(3) then time fields.
  const versionOffset = idx + 4;
  if (versionOffset >= buf.length) return null;
  const version = buf[versionOffset];

  try {
    if (version === 1) {
      // v1: creation(8) modification(8) timescale(4) duration(8)
      const base = versionOffset + 4 + 8 + 8;
      const timescale = buf.readUInt32BE(base);
      const duration = Number(buf.readBigUInt64BE(base + 4));
      if (timescale > 0) return Math.round(duration / timescale);
    } else {
      // v0: creation(4) modification(4) timescale(4) duration(4)
      const base = versionOffset + 4 + 4 + 4;
      const timescale = buf.readUInt32BE(base);
      const duration = buf.readUInt32BE(base + 4);
      if (timescale > 0) return Math.round(duration / timescale);
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * WebM/Matroska: the Duration element (id 0x4489) holds a float in "timecode
 * scale" units; TimecodeScale (id 0x2AD7B1) is ns per unit (default 1,000,000).
 */
function parseWebmDuration(buf: Buffer): number | null {
  // TimecodeScale — default to 1ms if not found.
  let timecodeScaleNs = 1_000_000;
  const tcsId = Buffer.from([0x2a, 0xd7, 0xb1]);
  const tcsIdx = buf.indexOf(tcsId);
  if (tcsIdx >= 0) {
    const sizeByte = buf[tcsIdx + 3];
    // Single-byte EBML size (top bit set) → length is low 7 bits.
    if (sizeByte && sizeByte >= 0x80) {
      const len = sizeByte & 0x7f;
      const start = tcsIdx + 4;
      if (len >= 1 && len <= 8 && start + len <= buf.length) {
        let v = 0;
        for (let i = 0; i < len; i++) v = v * 256 + buf[start + i];
        if (v > 0) timecodeScaleNs = v;
      }
    }
  }

  const durId = Buffer.from([0x44, 0x89]);
  const dIdx = buf.indexOf(durId);
  if (dIdx < 0) return null;
  const sizeByte = buf[dIdx + 2];
  if (!sizeByte || sizeByte < 0x80) return null;
  const len = sizeByte & 0x7f;
  const start = dIdx + 3;
  if (start + len > buf.length) return null;

  let raw: number;
  try {
    if (len === 4) raw = buf.readFloatBE(start);
    else if (len === 8) raw = buf.readDoubleBE(start);
    else return null;
  } catch {
    return null;
  }

  const seconds = (raw * timecodeScaleNs) / 1_000_000_000;
  return Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : null;
}

/**
 * Extract duration in whole seconds from a video buffer. Best-effort across
 * MP4/MOV and WebM/Matroska; returns null for unknown/unsupported inputs.
 */
export function getVideoDurationSec(
  buffer: Buffer,
  mimeType?: string,
): number | null {
  if (!buffer || buffer.length === 0) return null;

  const isWebm = mimeType?.includes("webm") || mimeType?.includes("matroska");
  // Try the likely format first, then fall back to the other.
  if (isWebm) {
    return parseWebmDuration(buffer) ?? parseMp4Duration(buffer);
  }
  return parseMp4Duration(buffer) ?? parseWebmDuration(buffer);
}
