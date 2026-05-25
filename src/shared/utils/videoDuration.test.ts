import { getVideoDurationSec } from "./videoDuration";

/** Build a minimal buffer containing an MP4 `mvhd` v0 atom with the given
 *  timescale + duration, padded so indexOf has realistic surroundings. */
function mp4V0(timescale: number, duration: number): Buffer {
  const pre = Buffer.from([0, 0, 0, 0]); // junk before the atom type
  const type = Buffer.from("mvhd");
  const body = Buffer.alloc(1 + 3 + 4 + 4 + 4 + 4); // version+flags+create+mod+ts+dur
  body.writeUInt8(0, 0); // version 0
  body.writeUInt32BE(timescale, 1 + 3 + 4 + 4);
  body.writeUInt32BE(duration, 1 + 3 + 4 + 4 + 4);
  return Buffer.concat([pre, type, body, Buffer.alloc(8)]);
}

/** MP4 `mvhd` v1 (64-bit duration). */
function mp4V1(timescale: number, duration: number): Buffer {
  const type = Buffer.from("mvhd");
  const body = Buffer.alloc(1 + 3 + 8 + 8 + 4 + 8);
  body.writeUInt8(1, 0); // version 1
  body.writeUInt32BE(timescale, 1 + 3 + 8 + 8);
  body.writeBigUInt64BE(BigInt(duration), 1 + 3 + 8 + 8 + 4);
  return Buffer.concat([type, body]);
}

describe("getVideoDurationSec", () => {
  it("parses MP4 mvhd v0 duration", () => {
    // 600 timescale, 36000 units → 60s
    expect(getVideoDurationSec(mp4V0(600, 36000), "video/mp4")).toBe(60);
  });

  it("parses MP4 mvhd v1 (64-bit) duration", () => {
    // 1000 timescale, 90000 units → 90s
    expect(getVideoDurationSec(mp4V1(1000, 90000), "video/mp4")).toBe(90);
  });

  it("rounds to whole seconds", () => {
    // 600 timescale, 30300 units → 50.5s → 51 (rounded), but check it's ~50/51
    const d = getVideoDurationSec(mp4V0(600, 30300), "video/mp4");
    expect(d).toBeGreaterThanOrEqual(50);
    expect(d).toBeLessThanOrEqual(51);
  });

  it("returns null for an empty buffer", () => {
    expect(getVideoDurationSec(Buffer.alloc(0), "video/mp4")).toBeNull();
  });

  it("returns null when no recognisable header is present", () => {
    expect(
      getVideoDurationSec(Buffer.from("not a video at all"), "video/mp4"),
    ).toBeNull();
  });

  it("does not throw on a truncated mvhd atom", () => {
    const truncated = Buffer.concat([Buffer.from("mvhd"), Buffer.from([0])]);
    expect(() => getVideoDurationSec(truncated, "video/mp4")).not.toThrow();
    expect(getVideoDurationSec(truncated, "video/mp4")).toBeNull();
  });
});
