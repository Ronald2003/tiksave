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
  if (!/\.mp4$/i.test(result.data.filename)) throw new ApiError(502, "provider_error", "The download backend returned an unsupported file.");
  return { ...parseTunnel(result.data.url, endpoint), filename: result.data.filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-180) };
}
function parseTunnel(value: string, endpoint: URL) {
  const url = new URL(value);
  const expiresAt = Number(url.searchParams.get("exp"));
  if (url.origin !== endpoint.origin || url.pathname !== "/tunnel" || url.username || url.password ||
      !Number.isFinite(expiresAt) || expiresAt <= Date.now() || expiresAt > Date.now() + 300000) {
    throw new ApiError(502, "provider_error", "The download backend returned an invalid or expired media link. Please try again.");
  }
  return { url: url.href, expiresAt };
}
export function parseCobaltMedia(value: unknown, endpoint: URL, platform?: string): Pick<import("@/lib/video/types").VideoResult, "directDownload" | "images" | "videos"> {
  const failure=z.object({error:z.object({code:z.string()})}).safeParse(value);
  if(failure.success) {
    const code=failure.data.error.code;
    if(code==="error.api.content.post.private"||code==="error.api.content.post.age") throw new ApiError(422,"authorization_required","This post is private, age-restricted, or requires authorized access. It cannot be downloaded here.");
    if (code === "error.api.content.post.unavailable") throw new ApiError(422, "post_unavailable", "This post is unavailable to the downloader. Open the original link or try another public post.");
    if(platform==="Instagram"&&(code==="error.api.fetch.empty"||code==="error.api.fetch.fail")) throw new ApiError(422,"source_unavailable","Instagram did not provide downloadable media to this server. The post may be unavailable, require sign-in, or be blocked from this hosting network. Try another public post.");
    throw new ApiError(422,"video_not_found","The source did not provide downloadable photos or video for this post. It may be unavailable or unsupported.");
  }
  const photo=z.object({status:z.literal("tunnel"),url:z.url(),filename:z.string().max(250).regex(/\.(?:jpe?g|png|webp|gif)$/i)}).safeParse(value);
  if(photo.success)return {images:[{...parseTunnel(photo.data.url,endpoint),filename:photo.data.filename.replace(/[^a-zA-Z0-9._-]/g,"_").slice(-180)}]};
  if (z.object({ status: z.literal("picker") }).safeParse(value).success) {
    const result = z.object({ picker: z.array(z.object({ type: z.enum(["photo","video"]), url: z.url(),thumb:z.url().optional() })).min(1).max(50) }).safeParse(value);
    if (!result.success) throw new ApiError(422, "unsupported_media", "This collection contains an unsupported media type.");
    const items=result.data.picker.map((item,index)=>({...parseTunnel(item.url,endpoint),type:item.type,filename:`${item.type==="photo"?"image":"video"}-${index+1}${item.type==="video"?".mp4":""}`,thumbnailUrl:item.thumb?parseTunnel(item.thumb,endpoint).url:undefined}));
    const images=items.filter(item=>item.type==="photo"),videos=items.filter(item=>item.type==="video");
    return { images:images.length?images:undefined,videos:videos.length?videos:undefined };
  }
  return { directDownload: parseCobaltDownload(value, endpoint) };
}
async function requestCobalt(endpoint: URL, canonicalUrl: string) {
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json", ...(process.env.COBALT_API_KEY ? { Authorization: `Api-Key ${process.env.COBALT_API_KEY}` } : {}) },
      body: JSON.stringify({ url: canonicalUrl, downloadMode: "auto", videoQuality: "1080", alwaysProxy: true, localProcessing: "disabled", filenameStyle: "basic" }),
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
  return parseCobaltMedia(data, endpoint, ["instagram.com","www.instagram.com"].includes(new URL(canonicalUrl).hostname)?"Instagram":undefined);
}
