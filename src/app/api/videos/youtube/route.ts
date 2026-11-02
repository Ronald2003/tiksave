import { z } from "zod";
import { api, checkOrigin, json, readJson } from "@/lib/security/http";
import { rateLimit } from "@/lib/security/rate-limit";
import { pollApifyYouTube } from "@/lib/video/resolvers/apify";
export const runtime = "nodejs";
export async function POST(request: Request) { return api(async () => {
  checkOrigin(request);
  const { jobToken } = await readJson(request, z.object({ jobToken: z.string().max(200) }));
  await rateLimit(request, "youtube-status", 60);
  return json(await pollApifyYouTube(jobToken));
}); }
