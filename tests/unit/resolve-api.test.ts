import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/security/rate-limit", () => ({ rateLimit: vi.fn() }));
vi.mock("@/lib/video/resolvers/short-link", () => ({ resolveTikTokUrl: vi.fn() }));
vi.mock("@/lib/video/resolvers/metadata", () => ({ resolveMetadata: vi.fn() }));
vi.mock("@/lib/video/resolvers/original", async (original) => ({ ...await original<object>(), resolveOriginals: vi.fn() }));
vi.mock("@/lib/env", () => ({ siteUrl: () => "http://localhost:3000", publicConfig: vi.fn() }));
import { POST } from "@/app/api/videos/resolve/route";
import { publicConfig } from "@/lib/env";
import { resolveTikTokUrl } from "@/lib/video/resolvers/short-link";
import { resolveMetadata } from "@/lib/video/resolvers/metadata";
import { resolveOriginals } from "@/lib/video/resolvers/original";
const url = "https://www.tiktok.com/@fixture/video/6718335390845095173";
const req = () => new Request("http://localhost:3000/api/videos/resolve", { method: "POST", headers: { Origin: "http://localhost:3000", "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
beforeEach(() => {
  vi.mocked(resolveTikTokUrl).mockResolvedValue({ url: new URL(url), videoId: "6718335390845095173", creator: "fixture" });
  vi.mocked(resolveMetadata).mockResolvedValue({ metadataAvailable: false });
  vi.mocked(resolveOriginals).mockResolvedValue([]);
});
describe("resolve API availability honesty", () => {
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
