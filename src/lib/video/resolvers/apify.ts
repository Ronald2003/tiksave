import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { ApiError } from "@/lib/security/errors";
import { parseVideoUrl } from "@/lib/validation/video";

const origin = "https://api.apify.com/v2";
const id = z.string().regex(/^[a-zA-Z0-9]{17}$/);
const unavailable = () => new ApiError(503, "provider_error", "YouTube downloads are temporarily unavailable or the shared free allowance is used up. Please try again later.");
const runSchema = z.object({ data: z.object({ id, status: z.string(), defaultDatasetId: id, defaultKeyValueStoreId: id }) });
function signature(value: string) {
  if (!process.env.APIFY_API_TOKEN) throw unavailable();
  return createHmac("sha256", process.env.APIFY_API_TOKEN).update(`youtube-job:${value}`).digest("base64url");
}
function pending(runId: string, videoId: string) {
  const value = `${runId}.${videoId}.${Date.now() + 360000}`;
  return { status: "processing" as const, jobToken: `${value}.${signature(value)}` };
}

export async function pollApifyYouTube(jobToken: string) {
  const parts = jobToken.split(".");
  const value = parts.slice(0,3).join(".");
  const supplied = Buffer.from(parts[3] || "");
  const expected = Buffer.from(signature(value));
  if (parts.length !== 4 || supplied.length !== expected.length || !timingSafeEqual(supplied, expected) ||
      !id.safeParse(parts[0]).success || !/^[a-zA-Z0-9_-]{11}$/.test(parts[1]) || !/^\d{13}$/.test(parts[2]) || Number(parts[2]) < Date.now()) {
    throw new ApiError(400, "invalid_job", "This download request has expired. Paste the link again.");
  }
  try {
    const run = runSchema.parse(await request(`/actor-runs/${parts[0]}`)).data;
    if (["READY", "RUNNING", "TIMING-OUT", "ABORTING"].includes(run.status)) return { status: "processing" as const, jobToken };
    if (run.status !== "SUCCEEDED") throw unavailable();
    const items = await request(`/datasets/${run.defaultDatasetId}/items?clean=true&limit=2`);
    return { status: "ready" as const, canonicalUrl: `https://www.youtube.com/watch?v=${parts[1]}`, ...parseApifyDownload(items, parts[1], run.defaultKeyValueStoreId) };
  } catch (error) { if (error instanceof ApiError) throw error; throw unavailable(); }
}

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
    // Actor preflight requires 300 seconds; poll separately to keep server requests short.
    const result = await request("/acts/marielise.dev~youtube-video-downloader/runs?waitForFinish=1&timeout=300&memory=2048&maxTotalChargeUsd=0.10&restartOnError=false&forcePermissionLevel=LIMITED_PERMISSIONS", {
      method: "POST", body: JSON.stringify({ urls: [{ url: `https://www.youtube.com/watch?v=${videoId}` }], quality: "720", format: "default", residentialProxyMode: "disabled" }),
    }, 15000);
    const run = runSchema.parse(result).data;
    if (["READY", "RUNNING", "TIMING-OUT", "ABORTING"].includes(run.status)) {
      return pending(run.id, videoId);
    }
    if (run.status !== "SUCCEEDED") throw unavailable();
    const items = await request(`/datasets/${run.defaultDatasetId}/items?clean=true&limit=2`);
    return parseApifyDownload(items, videoId, run.defaultKeyValueStoreId);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw unavailable();
  }
}
