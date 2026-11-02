import { api, ApiError, json } from "@/lib/security/http";
import { requireUser } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/security/rate-limit";
export const runtime = "nodejs";
export async function GET(request: Request) { return api(async () => {
  const { db, user } = await requireUser();
  await rateLimit(request, "library", 60, user.id);
  const [videos, downloads] = await Promise.all([
    db.from("videos").select("id,title,tiktok_video_id,created_at,is_public,upload_state,video_assets(id,file_size,is_public),upload_intents(id,expires_at)").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(20),
    db.from("downloads").select("id,video_id,status,created_at,videos(title)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
  ]);
  if (videos.error || downloads.error) throw new ApiError(503, "library_unavailable", "Your library could not be loaded. Please retry.");
  return json({ videos: videos.data, downloads: downloads.data });
}); }
