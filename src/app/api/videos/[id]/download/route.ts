import { api, checkOrigin, json, uuid } from "@/lib/security/http";
import { rateLimit } from "@/lib/security/rate-limit";
import { createDownload } from "@/lib/video/download";
export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { return api(async () => {
  checkOrigin(request);
  const { id } = await context.params;
  uuid(id);
  await rateLimit(request, "download", 15);
  return json(await createDownload(id));
}); }
