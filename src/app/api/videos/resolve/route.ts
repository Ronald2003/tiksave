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
export const runtime = "nodejs";
export async function POST(request: Request) { return api(async () => {
  checkOrigin(request);
  const { url } = await readJson(request, z.object({ url: videoUrlSchema }));
  await rateLimit(request, "resolve");
  const parsed = parseVideoUrl(url);
  const canonical = parsed.platform === "TikTok" ? await resolveTikTokUrl(url, true) : parsed;
  if (process.env.COBALT_API_URL) {
    const [media, metadata] = await Promise.all([resolveCobalt(canonical.url.href), parsed.platform === "TikTok" && !canonical.url.pathname.includes("/photo/") ? resolveMetadata(canonical.url.href) : Promise.resolve({ title: `${parsed.platform} ${canonical.url.pathname.includes("/photo/") ? "photos" : "video"}`, creatorName: undefined, thumbnailUrl: undefined })]);
    return json({ status: "ready", videoId: canonical.videoId, canonicalUrl: canonical.url.href,
      title: media.images||media.videos?`${parsed.platform} post`:metadata.title, creatorName: metadata.creatorName, thumbnailUrl: metadata.thumbnailUrl,
      ...media, message: media.videos?"Post media is available. Save each item before the links expire.":media.images ? "Photos are available. Save each image before the links expire." : "An MP4 is available. Download shortly before the link expires. Quality and watermark presence depend on the source file." });
  }
  if (parsed.platform !== "TikTok" || !canonical.videoId) throw new ApiError(503, "provider_configuration", "The video download backend is not configured.");
  if (canonical.url.pathname.includes("/photo/")) throw new ApiError(503, "provider_configuration", "Photo downloads need the download backend. Please try again later.");
  const [metadata, assets] = await Promise.all([resolveMetadata(canonical.url.href), resolveOriginals(canonical.videoId)]);
  if (!publicConfig()) return json({ status: "provider_error", videoId: canonical.videoId, canonicalUrl: canonical.url.href, title: metadata.title, creatorName: metadata.creatorName, thumbnailUrl: metadata.thumbnailUrl, assets: [], message: "Video link recognized. Creator storage is not configured, so clean-source availability cannot be checked." });
  return json(availability(assets, {
    videoId: canonical.videoId, canonicalUrl: canonical.url.href,
    title: metadata.title, creatorName: metadata.creatorName,
    thumbnailUrl: metadata.thumbnailUrl,
    ...(!metadata.metadataAvailable ? { message: "TikTok metadata is unavailable. Original availability was checked separately." } : {}),
  }));
}); }
