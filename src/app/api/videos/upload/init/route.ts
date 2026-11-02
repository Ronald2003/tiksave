import { api, ApiError, checkOrigin, json, readJson } from "@/lib/security/http";
import { requireUser } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { maxUploadBytes } from "@/lib/env";
import { rateLimit } from "@/lib/security/rate-limit";
import { uploadSchema } from "@/lib/validation/upload";
import { resolveTikTokUrl } from "@/lib/video/resolvers/short-link";
export const runtime = "nodejs";
export async function POST(request: Request) { return api(async () => {
  checkOrigin(request);
  const { user } = await requireUser();
  await rateLimit(request, "upload", 10, user.id);
  const input = await readJson(request, uploadSchema);
  if (input.fileSize > maxUploadBytes()) throw new ApiError(413, "file_too_large", "This video exceeds the configured upload limit.");
  const canonical = input.tiktokUrl ? await resolveTikTokUrl(input.tiktokUrl) : null;
  const admin = adminSupabase();
  const { data: intent, error } = await admin.rpc("initialize_upload", {
    p_owner: user.id, p_title: input.title, p_tiktok_id: canonical?.videoId || null,
    p_size: input.fileSize, p_public_metadata: input.publicMetadata, p_share_download: input.shareDownload,
  });
  if (error) {
    if (error.code === "23505") throw new ApiError(409, "duplicate_video", "You already have an upload associated with this TikTok video. Remove it before replacing the original.");
    if (error.message.includes("creator_quota_exceeded")) throw new ApiError(413, "quota_exceeded", "Your library limit is 20 videos or 200 MB. Remove an upload to make room.");
    throw new ApiError(503, "upload_unavailable", "The upload could not be initialized. Please try again.");
  }
  const { data: upload, error: signingError } = await admin.storage.from("originals").createSignedUploadUrl(intent.storage_path, { upsert: false });
  if (signingError || !upload) {
    await admin.from("videos").delete().eq("id", intent.video_id).eq("owner_id", user.id);
    throw new ApiError(503, "upload_unavailable", "Storage could not authorize this upload. Please try again later.");
  }
  return json({ intentId: intent.id, videoId: intent.video_id, signedUrl: upload.signedUrl, path: intent.storage_path }, 201);
}); }
