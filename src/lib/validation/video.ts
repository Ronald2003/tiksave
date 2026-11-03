import { z } from "zod";
import { parseTikTokUrl } from "./tiktok";

// Exact hosts only; arbitrary URLs never reach the media backend.
const services: Record<string, string> = {
  "facebook.com": "Facebook", "www.facebook.com": "Facebook", "m.facebook.com": "Facebook", "web.facebook.com": "Facebook", "fb.watch": "Facebook",
  "instagram.com": "Instagram", "www.instagram.com": "Instagram",
  "x.com": "X", "www.x.com": "X", "twitter.com": "X", "www.twitter.com": "X",
  "vimeo.com": "Vimeo", "www.vimeo.com": "Vimeo", "player.vimeo.com": "Vimeo",
  "reddit.com": "Reddit", "www.reddit.com": "Reddit", "old.reddit.com": "Reddit", "redd.it": "Reddit",
  "bsky.app": "Bluesky", "dailymotion.com": "Dailymotion", "www.dailymotion.com": "Dailymotion", "dai.ly": "Dailymotion",
  "pinterest.com": "Pinterest", "www.pinterest.com": "Pinterest", "pin.it": "Pinterest",
  "twitch.tv": "Twitch", "www.twitch.tv": "Twitch", "clips.twitch.tv": "Twitch",
  "streamable.com": "Streamable", "www.streamable.com": "Streamable",
};
export function parseVideoUrl(input: string) {
  const value = input.trim();
  const url = new URL(value);
  if (url.protocol !== "https:" || url.port || url.username || url.password || /[\\\u0000-\u0020]/.test(value) || /(?:^|\/)\.{1,2}(?:\/|$)|%2e/i.test(value)) throw new Error("Use a secure link from a supported video platform.");
  if (["tiktok.com", "www.tiktok.com", "m.tiktok.com", "vt.tiktok.com", "vm.tiktok.com"].includes(url.hostname)) return { ...parseTikTokUrl(value, true), platform: "TikTok" };
  const platform = services[url.hostname];
  if (!platform) throw new Error("Use a secure link from a supported video platform.");
  if (url.pathname === "/") throw new Error("Paste a video link, rather than a homepage or profile.");
  url.hash = "";
  return { url, platform, videoId: undefined, creator: undefined };
}
export const videoUrlSchema = z.string().trim().min(1, "Paste a video link to get started.").max(2048, "That link is too long.").superRefine((input, ctx) => {
  try { parseVideoUrl(input); }
  catch (error) { ctx.addIssue({ code: "custom", message: error instanceof TypeError ? "Enter a valid video URL starting with https://." : (error as Error).message }); }
});
