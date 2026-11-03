import "server-only";
import { parseTikTokUrl } from "@/lib/validation/tiktok";
import { safeTikTokGet } from "@/lib/security/network";
import { ApiError } from "@/lib/security/errors";
export async function resolveTikTokUrl(input: string, allowPhotos = false) {
  let current = parseTikTokUrl(input, allowPhotos);
  for (let hop = 0; !current.videoId && hop < 4; hop++) {
    const response = await safeTikTokGet(current.url, 16384);
    if (!response.location || response.status < 300 || response.status >= 400) throw new ApiError(422, "video_not_found", "This short link could not be resolved. Try the full TikTok video link.");
    try { current = parseTikTokUrl(new URL(response.location, current.url).href, allowPhotos); }
    catch { throw new ApiError(400, "invalid_url", "This short link redirects outside supported TikTok video links."); }
  }
  if (!current.videoId) throw new ApiError(422, "video_not_found", "This short link has too many redirects. Try the full video link.");
  return current as typeof current & { videoId: string };
}
