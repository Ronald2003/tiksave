import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/security/rate-limit", () => ({ rateLimit: vi.fn() }));
vi.mock("@/lib/video/resolvers/cobalt", () => ({ resolveCobalt: vi.fn() }));
vi.mock("@/lib/video/resolvers/apify", () => ({ resolveApifyYouTube: vi.fn() }));
vi.mock("@/lib/video/resolvers/short-link", () => ({ resolveTikTokUrl: vi.fn() }));
vi.mock("@/lib/video/resolvers/metadata", () => ({ resolveMetadata: vi.fn() }));
vi.mock("@/lib/video/resolvers/original", async (original) => ({ ...await original<object>(), resolveOriginals: vi.fn() }));
vi.mock("@/lib/env", () => ({ siteUrl: () => "http://localhost:3000", publicConfig: vi.fn() }));
import { POST } from "@/app/api/videos/resolve/route";
import { resolveCobalt } from "@/lib/video/resolvers/cobalt";
import { resolveApifyYouTube } from "@/lib/video/resolvers/apify";
import { rateLimit } from "@/lib/security/rate-limit";
import { publicConfig } from "@/lib/env";
import { resolveTikTokUrl } from "@/lib/video/resolvers/short-link";
import { resolveMetadata } from "@/lib/video/resolvers/metadata";
import { resolveOriginals } from "@/lib/video/resolvers/original";
const url = "https://www.tiktok.com/@fixture/video/6718335390845095173";
const req = () => new Request("http://localhost:3000/api/videos/resolve", { method: "POST", headers: { Origin: "http://localhost:3000", "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
beforeEach(() => {
  vi.unstubAllEnvs(); vi.clearAllMocks();
  vi.mocked(resolveTikTokUrl).mockResolvedValue({ url: new URL(url), videoId: "6718335390845095173", creator: "fixture" });
  vi.mocked(resolveMetadata).mockResolvedValue({ metadataAvailable: false });
  vi.mocked(resolveOriginals).mockResolvedValue([]);
});
describe("resolve API availability honesty", () => {
  it("uses the capped YouTube provider with both personal and shared limits", async () => {
    vi.stubEnv("APIFY_API_TOKEN", "explicit-test-token");
    vi.stubEnv("COBALT_API_URL", "https://backend.example/");
    vi.mocked(resolveApifyYouTube).mockResolvedValue({ title: "Test video", creatorName: "Creator", resolution: "720p", directDownload: { url: "https://api.apify.com/test", filename: "video.mp4", expiresAt: Date.now() + 300000 } });
    const response = await POST(new Request("http://localhost:3000/api/videos/resolve", { method: "POST", headers: { Origin: "http://localhost:3000", "Content-Type": "application/json" }, body: JSON.stringify({ url: "https://youtu.be/bTsGuYRerK8" }) }));
    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({ status: "ready", title: "Test video" });
    expect(resolveCobalt).not.toHaveBeenCalled();
    expect(rateLimit).toHaveBeenCalledWith(expect.any(Request), "youtube", 2);
    expect(rateLimit).toHaveBeenCalledWith(expect.any(Request), "youtube-global", 3, "shared-youtube-budget");
  });
  it.each(["https://www.youtube.com/watch?v=jNQXAC9IVRw", "https://www.facebook.com/watch/?v=123456789", "https://www.instagram.com/reel/abcdef/"])("routes %s to Cobalt without TikTok fetches", async (url) => {
    vi.stubEnv("COBALT_API_URL", "https://backend.example/");
    vi.mocked(resolveCobalt).mockResolvedValue({ url: "https://backend.example/tunnel", filename: "video.mp4", expiresAt: Date.now() + 90000 });
    const response = await POST(new Request("http://localhost:3000/api/videos/resolve", { method: "POST", headers: { Origin: "http://localhost:3000", "Content-Type": "application/json" }, body: JSON.stringify({ url }) }));
    expect(response.status).toBe(200);
    expect((await response.json()).data.status).toBe("ready");
    expect(resolveCobalt).toHaveBeenCalledWith(url);
    expect(resolveTikTokUrl).not.toHaveBeenCalled();
    expect(resolveMetadata).not.toHaveBeenCalled();
    expect(resolveOriginals).not.toHaveBeenCalled();
  });
  it("does not claim a database check when storage is unconfigured", async () => {
    vi.mocked(publicConfig).mockReturnValue(null);
    const response = await POST(req());
    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({ status: "provider_error", assets: [], message: expect.stringContaining("cannot be checked") });
  });
  it("reports unavailable only after the configured source lookup", async () => {
    vi.mocked(publicConfig).mockReturnValue({ url: "https://fixture.supabase.co", key: "explicit-test-key" });
    const response = await POST(req());
    expect((await response.json()).data).toMatchObject({ status: "clean_source_unavailable", assets: [] });
    expect(resolveOriginals).toHaveBeenCalledWith("6718335390845095173");
  });
});
