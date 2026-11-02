import "server-only";
import { z } from "zod";
import { ApiError } from "@/lib/security/errors";

export function cobaltEndpoint(value: string) {
  const url = new URL(value);
  const local = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
      (url.protocol !== "https:" && !(url.protocol === "http:" && local && process.env.NODE_ENV !== "production"))) {
    throw new ApiError(503, "provider_configuration", "The download backend address is not configured correctly.");
  }
  if (local && process.env.NODE_ENV === "production") throw new ApiError(503, "provider_configuration", "Production needs an accessible HTTPS download backend.");
  return url;
}
export function parseCobaltDownload(value: unknown, endpoint: URL) {
  const result = z.object({ status: z.literal("tunnel"), url: z.url(), filename: z.string().min(1).max(250) }).safeParse(value);
  if (!result.success) throw new ApiError(422, "video_not_found", "The download backend could not provide an MP4 for this link. The post may be unavailable or unsupported.");
  const url = new URL(result.data.url);
  const expiresAt = Number(url.searchParams.get("exp"));
  if (url.origin !== endpoint.origin || url.pathname !== "/tunnel" || url.username || url.password ||
      !Number.isFinite(expiresAt) || expiresAt <= Date.now() || expiresAt > Date.now() + 300000 || !/\.mp4$/i.test(result.data.filename)) {
    throw new ApiError(502, "provider_error", "The download backend returned an invalid or expired media link. Please try again.");
  }
  return { url: url.href, filename: result.data.filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-180), expiresAt };
}
async function requestCobalt(endpoint: URL, canonicalUrl: string) {
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json", ...(process.env.COBALT_API_KEY ? { Authorization: `Api-Key ${process.env.COBALT_API_KEY}` } : {}) },
      body: JSON.stringify({ url: canonicalUrl, downloadMode: "auto", videoQuality: "1080", youtubeVideoCodec: "h264", youtubeVideoContainer: "mp4", alwaysProxy: true, localProcessing: "disabled", filenameStyle: "basic" }),
      signal: AbortSignal.timeout(15000), redirect: "error", cache: "no-store",
    });
  } catch { throw new ApiError(503, "provider_error", "The download backend is offline or did not respond. Please try again later."); }
  if (response.status === 429 || response.status >= 500 || !response.body) { await response.body?.cancel(); throw new ApiError(response.status === 429 ? 429 : 503, "provider_error", "The download backend is temporarily unavailable. Please try again later."); }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 65536) { await reader.cancel(); throw new ApiError(502, "provider_error", "The download backend returned an oversized response."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  let data: unknown;
  try { data = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new ApiError(502, "provider_error", "The download backend returned an unreadable response."); }
  return data;
}
export async function resolveCobalt(canonicalUrl: string) {
  const endpoint = cobaltEndpoint(process.env.COBALT_API_URL || "");
  let data = await requestCobalt(endpoint, canonicalUrl);
  // Retry a transient page fetch once; never retry restrictions, rate limits, or authorization errors.
  if (z.object({ error: z.object({ code: z.literal("error.api.fetch.fail") }) }).safeParse(data).success) data = await requestCobalt(endpoint, canonicalUrl);
  return parseCobaltDownload(data, endpoint);
}
