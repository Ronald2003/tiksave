import { describe, expect, it } from "vitest";
import { parseTikTokUrl, tiktokUrlSchema } from "@/lib/validation/tiktok";
const id = "6718335390845095173";
describe("TikTok URL trust boundary", () => {
  it("extracts and normalizes a full video URL and drops tracking", () => {
    const result = parseTikTokUrl(`  https://m.tiktok.com/@scout2015/video/${id}/?tracking=1#share  `);
    expect(result.videoId).toBe(id);
    expect(result.url.href).toBe(`https://www.tiktok.com/@scout2015/video/${id}`);
  });
  it.each(["https://vm.tiktok.com/ABCdef/", "https://vt.tiktok.com/ABCdef/", "https://www.tiktok.com/t/ABCdef/"])("supports short-link format %s", (url) => expect(parseTikTokUrl(url).videoId).toBeUndefined());
  it.each([
    `http://www.tiktok.com/@a/video/${id}`, `https://tiktok.com.evil.test/@a/video/${id}`,
    `https://evil-tiktok.com/@a/video/${id}`, `https://www.tiktok.com:444/@a/video/${id}`,
    `https://user:pass@www.tiktok.com/@a/video/${id}`, `https://www.tiktok.com./@a/video/${id}`,
    "https://127.0.0.1/video/123", "https://[::1]/", "file:///etc/passwd", "https://www.tiktok.com/@a",
    "https://www.tiktok.com/@a/video/123", "https://www.tiktok.com/oembed", "https://vm.tiktok.com/../../admin",
    `https://www.tiktok.com\\@evil.test/@a/video/${id}`, "", "not a URL",
  ])("rejects unsafe or non-video input %s", (url) => expect(tiktokUrlSchema.safeParse(url).success).toBe(false));
});
