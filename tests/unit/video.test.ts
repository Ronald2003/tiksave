import { describe, expect, it } from "vitest";
import { parseVideoUrl, videoUrlSchema } from "@/lib/validation/video";

describe("supported video URLs", () => {
  it("accepts TikTok photo posts while keeping creator uploads video-only", async () => {
    const url = "https://www.tiktok.com/@4kwallpapers85/photo/7688136271289388310?tracking=1";
    expect(parseVideoUrl(url).url.pathname).toBe("/@4kwallpapers85/photo/7688136271289388310");
    const { tiktokUrlSchema } = await import("@/lib/validation/tiktok");
    expect(tiktokUrlSchema.safeParse(url).success).toBe(false);
  });
  it.each([
    ["https://www.facebook.com/watch/?v=123456789", "Facebook"],
    ["https://fb.watch/abcdef/", "Facebook"],
    ["https://www.instagram.com/reel/abcdef/", "Instagram"],
    ["https://x.com/example/status/123456789", "X"],
    ["https://vimeo.com/123456", "Vimeo"],
    ["https://www.reddit.com/r/example/comments/abcdef/video/", "Reddit"],
    ["https://bsky.app/profile/example.com/post/abcdef", "Bluesky"],
    ["https://www.dailymotion.com/video/x123456", "Dailymotion"],
    ["https://pin.it/abcdef", "Pinterest"],
    ["https://clips.twitch.tv/abcdef", "Twitch"],
    ["https://streamable.com/abcdef", "Streamable"],
  ])("accepts %s", (url, platform) => expect(parseVideoUrl(url).platform).toBe(platform));
  it("preserves query parameters that identify videos", () => expect(parseVideoUrl("https://www.facebook.com/watch/?v=123456789").url.searchParams.get("v")).toBe("123456789"));
  it.each(["https://youtube.com.evil.test/watch?v=jNQXAC9IVRw", "https://127.0.0.1/video", "http://youtu.be/jNQXAC9IVRw", "https://user:pass@youtu.be/jNQXAC9IVRw", "https://youtu.be:8443/jNQXAC9IVRw", "https://www.youtube.com/playlist?list=123", "https://www.youtube.com/", "https://youtu.be/../jNQXAC9IVRw", "https://www.youtube.com/watch?v=bad"]) ("rejects unsafe or unsupported input %s", url => expect(videoUrlSchema.safeParse(url).success).toBe(false));
  it.each(["https://www.youtube.com/watch?v=jNQXAC9IVRw", "https://youtu.be/jNQXAC9IVRw", "https://www.youtube.com/shorts/jNQXAC9IVRw", "https://music.youtube.com/watch?v=jNQXAC9IVRw"])("rejects removed YouTube support %s", url => expect(videoUrlSchema.safeParse(url).success).toBe(false));
  it("keeps TikTok validation strict", () => {
    expect(videoUrlSchema.safeParse("https://www.tiktok.com/@profile").success).toBe(false);
    expect(parseVideoUrl("https://vt.tiktok.com/ZSgoeS7LW/").platform).toBe("TikTok");
  });
});
