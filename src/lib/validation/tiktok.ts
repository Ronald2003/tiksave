import { z } from "zod";

const hosts = new Set(["tiktok.com", "www.tiktok.com", "m.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"]);
export function parseTikTokUrl(input: string) {
  if (/(?:^|\/)\.{1,2}(?:\/|$)/.test(input) || /%2e/i.test(input)) throw new Error("Use a direct TikTok video or short link without path traversal.");
  const url = new URL(input.trim());
  if (url.protocol !== "https:" || !hosts.has(url.hostname) || url.port || url.username || url.password || /[\\\u0000-\u0020]/.test(input.trim())) throw new Error("Use a secure link from tiktok.com, vm.tiktok.com, or vt.tiktok.com.");
  const canonical = /^\/@([\w.]{1,30})\/video\/(\d{15,25})\/?$/.exec(url.pathname);
  const short = /^(vm|vt)\.tiktok\.com$/.test(url.hostname) && /^\/[\w-]{4,100}\/?$/.test(url.pathname);
  const shared = ["www.tiktok.com", "tiktok.com", "m.tiktok.com"].includes(url.hostname) && /^\/t\/[\w-]{4,100}\/?$/.test(url.pathname);
  if (!canonical && !short && !shared) throw new Error("Paste a TikTok video link, rather than a profile or search page.");
  url.hash = "";
  url.search = "";
  if (canonical) { url.hostname = "www.tiktok.com"; url.pathname = `/@${canonical[1]}/video/${canonical[2]}`; }
  return { url, videoId: canonical?.[2], creator: canonical?.[1] };
}
export const tiktokUrlSchema = z.string().trim().min(1, "Paste a TikTok video link to get started.").max(2048, "That link is too long.").superRefine((input, ctx) => {
  try { parseTikTokUrl(input); }
  catch (error) { ctx.addIssue({ code: "custom", message: error instanceof TypeError ? "Enter a valid TikTok video URL starting with https://." : (error as Error).message }); }
});
