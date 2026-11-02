import { api, ApiError, checkOrigin, json, uuid, readJson } from "@/lib/security/http";
import { requireUser, serverSupabase } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/security/rate-limit";
import { z } from "zod";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) { return api(async () => {
  const id = uuid((await context.params).id);
  await rateLimit(request, "video-read", 30);
  const db = await serverSupabase();
  const { data, error } = await db.from("videos").select("id,title,creator_name,tiktok_video_id,is_public,upload_state,created_at,video_assets(id,file_size,mime_type,width,height,is_public,authorization_status)").eq("id", id).maybeSingle();
  if (error) throw new ApiError(503, "database_unavailable", "The video could not be retrieved.");
  if (!data) throw new ApiError(404, "video_not_found", "Video unavailable or private.");
  return json(data);
}); }
export async function DELETE(request: Request, context: Context) { return api(async () => {
  checkOrigin(request);
  const { user } = await requireUser();
  await rateLimit(request, "delete", 20, user.id);
  const id = uuid((await context.params).id);
  const admin = adminSupabase();
  const { data: video, error: readError } = await admin.from("videos").select("id,created_at,upload_intents(id)").eq("id", id).eq("owner_id", user.id).maybeSingle();
  if (readError) throw new ApiError(503, "database_unavailable", "The video could not be retrieved.");
  if (!video) throw new ApiError(404, "video_not_found", "Video not found in your library.");
  const { error: stateError } = await admin.from("videos").update({ upload_state: "deleting", updated_at: new Date().toISOString() }).eq("id", id).eq("owner_id", user.id);
  if (stateError) throw new ApiError(503, "delete_failed", "The video could not be prepared for deletion.");
  const { error: storageError } = await admin.storage.from("originals").remove([`${user.id}/${id}/original.mp4`]);
  if (storageError) throw new ApiError(503, "delete_failed", "Storage deletion failed. This video is hidden from downloads. Retry deletion from your library.");
  // Keep a tombstone until any two-hour signed upload token has expired.
  if (video.upload_intents.length && new Date(video.created_at).getTime() > Date.now() - 3 * 60 * 60 * 1000) return json({ deleted: false, scheduled: true });
  const { error } = await admin.from("videos").delete().eq("id", id).eq("owner_id", user.id);
  if (error) throw new ApiError(503, "delete_failed", "The file was removed, but its library entry needs deletion. Please retry.");
  return json({ deleted: true });
}); }
export async function PATCH(request: Request, context: Context) { return api(async () => {
  checkOrigin(request);
  const { user } = await requireUser();
  await rateLimit(request, "sharing", 20, user.id);
  const id = uuid((await context.params).id);
  const { shared } = await readJson(request, z.object({ shared: z.boolean() }));
  const admin = adminSupabase();
  // Revoke the download first; metadata visibility is independent of file permission.
  const { data, error } = await admin.from("video_assets").update({ is_public: shared }).eq("video_id", id).eq("owner_id", user.id).select("id").maybeSingle();
  if (error) throw new ApiError(503, "sharing_failed", "Sharing could not be updated.");
  if (!data) throw new ApiError(404, "video_not_found", "Video not found in your library.");
  if (shared) {
    const { error: metadataError } = await admin.from("videos").update({ is_public: true, updated_at: new Date().toISOString() }).eq("id", id).eq("owner_id", user.id);
    if (metadataError) throw new ApiError(503, "sharing_failed", "Metadata visibility could not be updated. Please retry.");
  }
  return json({ shared });
}); }
