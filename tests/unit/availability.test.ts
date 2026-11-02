import { describe, expect, it } from "vitest";
import { availability, canDownload } from "@/lib/video/resolvers/original";
import type { DownloadAsset } from "@/lib/video/types";
const asset: DownloadAsset = { id: "asset", video_id: "video", file_size: 100, width: null, height: null, authorization_status: "authorized", is_public: false, owner_id: "owner", storage_path: "private/file.mp4" };
describe("download permission", () => {
  it("allows the owner of an authorized original", () => expect(canDownload(asset, "owner")).toBe(true));
  it("denies anonymous and other users on private originals", () => { expect(canDownload(asset)).toBe(false); expect(canDownload(asset, "other")).toBe(false); });
  it("requires explicit public sharing", () => expect(canDownload({ ...asset, is_public: true })).toBe(true));
  it.each(["pending", "revoked"])("denies %s originals even to their owner", (authorization_status) => expect(canDownload({ ...asset, authorization_status, is_public: true }, "owner")).toBe(false));
});
describe("availability states", () => {
  it("does not fabricate a download when no source exists", () => expect(availability([], { videoId: "test" })).toMatchObject({ status: "clean_source_unavailable", assets: [], message: "Watermark-free original unavailable for this video." }));
  it("offers only a real original without invented HD quality", () => { const result = availability([asset], {}); expect(result.status).toBe("ready"); expect(result.assets).toEqual([{ id: "asset", label: "Download MP4", fileSize: 100 }]); expect(result.resolution).toBeUndefined(); });
});
