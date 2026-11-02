import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/security/network", () => ({ safeTikTokGet: vi.fn() }));
import { safeTikTokGet } from "@/lib/security/network";
import { resolveTikTokUrl } from "@/lib/video/resolvers/short-link";
const get = vi.mocked(safeTikTokGet);
beforeEach(() => get.mockReset());
describe("short-link redirects", () => {
  it("does not request a canonical video page", async () => {
    const result = await resolveTikTokUrl("https://www.tiktok.com/@a/video/6718335390845095173");
    expect(result.videoId).toBe("6718335390845095173"); expect(get).not.toHaveBeenCalled();
  });
  it("resolves a supported redirect", async () => {
    get.mockResolvedValue({ status: 302, location: "https://www.tiktok.com/@a/video/6718335390845095173?share=1", body: "" });
    expect((await resolveTikTokUrl("https://vm.tiktok.com/ABCdef/")).videoId).toBe("6718335390845095173");
  });
  it.each(["https://evil.test/video/123", "http://www.tiktok.com/@a/video/6718335390845095173", "https://127.0.0.1/", "https://www.tiktok.com/oembed"])("rejects destination %s", async (location) => {
    get.mockResolvedValue({ status: 302, location, body: "" });
    await expect(resolveTikTokUrl("https://vm.tiktok.com/ABCdef/")).rejects.toMatchObject({ code: "invalid_url" });
    expect(get).toHaveBeenCalledTimes(1);
  });
  it("caps redirect loops", async () => {
    get.mockResolvedValue({ status: 302, location: "https://vm.tiktok.com/ABCdef/", body: "" });
    await expect(resolveTikTokUrl("https://vm.tiktok.com/ABCdef/")).rejects.toMatchObject({ code: "video_not_found" }); expect(get).toHaveBeenCalledTimes(4);
  });
  it("reports an unresolved short link", async () => {
    get.mockResolvedValue({ status: 200, body: "" });
    await expect(resolveTikTokUrl("https://vm.tiktok.com/ABCdef/")).rejects.toMatchObject({ status: 422 });
  });
});
