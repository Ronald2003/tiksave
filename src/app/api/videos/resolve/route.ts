import { z } from "zod";
import { api, checkOrigin, json, readJson } from "@/lib/security/http";
import { rateLimit } from "@/lib/security/rate-limit";
import { parseVideoUrl, videoUrlSchema } from "@/lib/validation/video";
import { ApiError } from "@/lib/security/errors";
import { resolveTikTokUrl } from "@/lib/video/resolvers/short-link";
import { resolveMetadata } from "@/lib/video/resolvers/metadata";
import { availability, resolveOriginals } from "@/lib/video/resolvers/original";
import { publicConfig } from "@/lib/env";
import { resolveCobalt } from "@/lib/video/resolvers/cobalt";
import { resolveApifyYouTube } from "@/lib/video/resolvers/apify";
export const runtime = "nodejs";
export async function POST(request: Request) { return api(async () => {
  checkOrigin(request);
  const { url } = await readJson(request, z.object({ url: videoUrlSchema }));
  await rateLimit(request, "resolve");
  const parsed = parseVideoUrl(url);
  const canonical = parsed.platform === "TikTok" ? await resolveTikTokUrl(url) : parsed;
  if (parsed.platform === "YouTube" && process.env.APIFY_API_TOKEN) {
    await rateLimit(request, "youtube", 2);
    await rateLimit(request, "youtube-global", 3, "shared-youtube-budget");
    const video = await resolveApifyYouTube(canonical.url.href);
    return json({ status: "ready", canonicalUrl: canonical.url.href, ...video,
      message: "Your MP4 is ready. Save it within five minutes. YouTube downloads use a limited shared allowance." });
  }
  if (process.env.COBALT_API_URL) {
    const [directDownload, metadata] = await Promise.all([resolveCobalt(canonical.url.href), parsed.platform === "TikTok" ? resolveMetadata(canonical.url.href) : Promise.resolve({ title: `${parsed.platform} video`, creatorName: undefined, thumbnailUrl: undefined })]);
    return json({ status: "ready", videoId: canonical.videoId, canonicalUrl: canonical.url.href,
      title: metadata.title, creatorName: metadata.creatorName, thumbnailUrl: metadata.thumbnailUrl,
      directDownload, message: "An MP4 is available. Download shortly before the link expires. Quality and watermark presence depend on the source file." });
  }
  if (parsed.platform !== "TikTok" || !canonical.videoId) throw new ApiError(503, "provider_configuration", "The video download backend is not configured.");
  const [metadata, assets] = await Promise.all([resolveMetadata(canonical.url.href), resolveOriginals(canonical.videoId)]);
  if (!publicConfig()) return json({ status: "provider_error", videoId: canonical.videoId, canonicalUrl: canonical.url.href, title: metadata.title, creatorName: metadata.creatorName, thumbnailUrl: metadata.thumbnailUrl, assets: [], message: "Video link recognized. Creator storage is not configured, so clean-source availability cannot be checked." });
  return json(availability(assets, {
    videoId: canonical.videoId, canonicalUrl: canonical.url.href,
    title: metadata.title, creatorName: metadata.creatorName,
    thumbnailUrl: metadata.thumbnailUrl,
    ...(!metadata.metadataAvailable ? { message: "TikTok metadata is unavailable. Original availability was checked separately." } : {}),
  }));
}); }
