import { z } from "zod";
import { api, checkOrigin, json, readJson } from "@/lib/security/http";
import { rateLimit } from "@/lib/security/rate-limit";
import { tiktokUrlSchema } from "@/lib/validation/tiktok";
import { resolveTikTokUrl } from "@/lib/video/resolvers/short-link";
import { resolveMetadata } from "@/lib/video/resolvers/metadata";
import { availability, resolveOriginals } from "@/lib/video/resolvers/original";
import { publicConfig } from "@/lib/env";
import { resolveCobalt } from "@/lib/video/resolvers/cobalt";
export const runtime = "nodejs";
export async function POST(request: Request) { return api(async () => {
  checkOrigin(request);
  const { url } = await readJson(request, z.object({ url: tiktokUrlSchema }));
  await rateLimit(request, "resolve");
  const canonical = await resolveTikTokUrl(url);
  if (process.env.COBALT_API_URL) {
    const [directDownload, metadata] = await Promise.all([resolveCobalt(canonical.url.href), resolveMetadata(canonical.url.href)]);
    return json({ status: "ready", videoId: canonical.videoId, canonicalUrl: canonical.url.href,
      title: metadata.title, creatorName: metadata.creatorName, thumbnailUrl: metadata.thumbnailUrl,
      directDownload, message: "An MP4 is available. Download shortly before the link expires. No account or upload is required. Quality and watermark presence depend on the source file." });
  }
  const [metadata, assets] = await Promise.all([resolveMetadata(canonical.url.href), resolveOriginals(canonical.videoId)]);
  if (!publicConfig()) return json({ status: "provider_error", videoId: canonical.videoId, canonicalUrl: canonical.url.href, title: metadata.title, creatorName: metadata.creatorName, thumbnailUrl: metadata.thumbnailUrl, assets: [], message: "Video link recognized. Creator storage is not configured, so clean-source availability cannot be checked." });
  return json(availability(assets, {
    videoId: canonical.videoId, canonicalUrl: canonical.url.href,
    title: metadata.title, creatorName: metadata.creatorName,
    thumbnailUrl: metadata.thumbnailUrl,
    ...(!metadata.metadataAvailable ? { message: "TikTok metadata is unavailable. Original availability was checked separately." } : {}),
  }));
}); }
