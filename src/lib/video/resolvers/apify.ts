import "server-only";
import { z } from "zod";
import { ApiError } from "@/lib/security/errors";
import { parseVideoUrl } from "@/lib/validation/video";

const origin = "https://api.apify.com/v2";
const id = z.string().regex(/^[a-zA-Z0-9]{17}$/);
const unavailable = () => new ApiError(503, "provider_error", "YouTube downloads are temporarily unavailable or the shared free allowance is used up. Please try again later.");

async function request(path: string, init: RequestInit = {}, timeout = 5000): Promise<unknown> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw unavailable();
  const response = await fetch(`${origin}${path}`, {
    ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(timeout), redirect: "error", cache: "no-store",
  });
  if (!response.ok || !response.body) { await response.body?.cancel(); throw unavailable(); }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 65536) { await reader.cancel(); throw unavailable(); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export function parseApifyDownload(value: unknown, videoId: string, storeId: string) {
  const parsed = z.array(z.object({
    status: z.literal("success"), videoId: z.literal(videoId), downloadUrl: z.url(),
    title: z.string().min(1).max(1000), uploader: z.string().max(300).optional(),
    deliveredQuality: z.string().regex(/^\d{3,4}p$/).optional(),
  })).length(1).safeParse(value);
  if (!parsed.success) throw new ApiError(422, "video_not_found", "This YouTube video could not be downloaded. Try a short public video.");
  const item = parsed.data[0];
  const url = new URL(item.downloadUrl);
  if (url.origin !== "https://api.apify.com" || url.username || url.password || url.hash ||
      !id.safeParse(storeId).success || url.pathname !== `/v2/key-value-stores/${storeId}/records/${videoId}.mp4` ||
      !url.searchParams.get("signature") || [...url.searchParams.keys()].some(key => key !== "signature")) {
    throw new ApiError(502, "provider_error", "The YouTube provider returned an invalid download link.");
  }
  return {
    title: item.title, creatorName: item.uploader, resolution: item.deliveredQuality,
    // shortcut: offer stored files for five minutes; add a shared result cache if repeat traffic grows.
    directDownload: { url: url.href, filename: `youtube-${videoId}.mp4`, expiresAt: Date.now() + 300000 },
  };
}

export async function resolveApifyYouTube(canonicalUrl: string) {
  const parsed = parseVideoUrl(canonicalUrl);
  if (parsed.platform !== "YouTube") throw new ApiError(400, "invalid_url", "A YouTube video link is required.");
  const url = parsed.url;
  const videoId = url.pathname === "/watch" ? url.searchParams.get("v") : url.hostname === "youtu.be" ? url.pathname.split("/")[1] : url.pathname.split("/")[2];
  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) throw new ApiError(400, "invalid_url", "A YouTube video link is required.");
  try {
    // Fixed actor, no credentials/proxies in input, no retry that could create a second billed run.
    const result = await request("/acts/marielise.dev~youtube-video-downloader/runs?waitForFinish=40&timeout=45&memory=2048&maxTotalChargeUsd=0.10&restartOnError=false&forcePermissionLevel=LIMITED_PERMISSIONS", {
      method: "POST", body: JSON.stringify({ urls: [{ url: `https://www.youtube.com/watch?v=${videoId}` }], quality: "720", format: "default", residentialProxyMode: "disabled" }),
    }, 45000);
    const run = z.object({ data: z.object({ id, status: z.string(), defaultDatasetId: id, defaultKeyValueStoreId: id }) }).parse(result).data;
    if (["READY", "RUNNING", "TIMING-OUT", "ABORTING"].includes(run.status)) {
      await request(`/actor-runs/${run.id}/abort`, { method: "POST" }, 3000).catch(() => {});
      throw new ApiError(503, "provider_error", "This YouTube video took too long to prepare. Try a shorter video.");
    }
    if (run.status !== "SUCCEEDED") throw unavailable();
    const items = await request(`/datasets/${run.defaultDatasetId}/items?clean=true&limit=2`);
    return parseApifyDownload(items, videoId, run.defaultKeyValueStoreId);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw unavailable();
  }
}
