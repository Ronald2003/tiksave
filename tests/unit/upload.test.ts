import { describe, expect, it } from "vitest";
import { isMp4 } from "@/lib/video/mp4";
import { uploadSchema } from "@/lib/validation/upload";
const header = Uint8Array.from([0,0,0,24,102,116,121,112,105,115,111,109,0,0,0,1,105,115,111,109,109,112,52,50]);
describe("MP4 container signature", () => {
  it("recognizes a common ISO BMFF signature", () => expect(isMp4(header)).toBe(true));
  it.each([new Uint8Array(), new TextEncoder().encode("<html>not a video</html>"), new Uint8Array(30)])("rejects a non-MP4", (value) => expect(isMp4(value)).toBe(false));
  it("rejects a truncated or malformed ftyp box", () => { expect(isMp4(header.slice(0,20))).toBe(false); const broken = header.slice(); broken[3] = 25; expect(isMp4(broken)).toBe(false); });
});
describe("upload metadata validation", () => {
  const valid = { title: "My original", filename: "video.mp4", mimeType: "video/mp4", fileSize: 200, rightsAttested: true };
  it("defaults uploads to private", () => expect(uploadSchema.parse(valid)).toMatchObject({ shareDownload: false, publicMetadata: false }));
  it("requires rights attestation", () => expect(uploadSchema.safeParse({ ...valid, rightsAttested: false }).success).toBe(false));
  it("rejects oversized files and spoofed MIME types", () => { expect(uploadSchema.safeParse({ ...valid, fileSize: 26214401 }).success).toBe(false); expect(uploadSchema.safeParse({ ...valid, mimeType: "text/html" }).success).toBe(false); });
});
