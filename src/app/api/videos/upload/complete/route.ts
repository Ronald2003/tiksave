import { z } from "zod";
import { api, ApiError, checkOrigin, json, readJson } from "@/lib/security/http";
import { requireUser } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { maxUploadBytes } from "@/lib/env";
import { rateLimit } from "@/lib/security/rate-limit";
import { isMp4 } from "@/lib/video/mp4";
import { readMp4Prefix } from "@/lib/storage/inspect";
export const runtime = "nodejs";
export async function POST(request: Request) { return api(async () => {
  checkOrigin(request);
  const { user } = await requireUser();
  await rateLimit(request, "complete", 20, user.id);
  const { intentId, videoId } = await readJson(request, z.object({ intentId: z.uuid(), videoId: z.uuid() }));
  const admin = adminSupabase();
  const { data: intent, error: intentError } = await admin.from("upload_intents").select("*").eq("id", intentId).eq("video_id", videoId).eq("owner_id", user.id).maybeSingle();
  if (intentError) throw new ApiError(503, "upload_unavailable", "Upload verification is temporarily unavailable.");
  if (!intent) {
    const { data: completed, error } = await admin.from("video_assets").select("id").eq("video_id", videoId).eq("owner_id", user.id).maybeSingle();
    if (!error && completed) return json({ assetId: completed.id, videoId });
    throw new ApiError(404, "upload_not_found", "Upload reservation not found. Start a new upload.");
  }
  if (new Date(intent.expires_at).getTime() < Date.now()) throw new ApiError(410, "upload_expired", "This upload reservation expired. Remove the pending item and upload again.");
  const bucket = admin.storage.from("originals");
  const { data: info, error: infoError } = await bucket.info(intent.storage_path);
  if (infoError || !info) throw new ApiError(422, "upload_incomplete", "The uploaded file was not found. Wait for the transfer to finish and try again.");
  const size = Number(info.size ?? info.metadata?.size);
  const mime = info.contentType ?? info.metadata?.mimetype;
  if (size !== intent.expected_size || size > maxUploadBytes() || mime !== "video/mp4" || (info.contentEncoding && info.contentEncoding !== "identity")) throw new ApiError(422, "invalid_file", "The stored file size, content type, or encoding does not match the upload.");
  const { data: signed, error: signError } = await bucket.createSignedUrl(intent.storage_path, 30);
  if (signError || !signed) throw new ApiError(503, "storage_unavailable", "Storage verification failed. Please try again.");
  const response = await fetch(signed.signedUrl, { headers: { Range: "bytes=0-4095" }, signal: AbortSignal.timeout(8000), redirect: "error", cache: "no-store" });
  const bytes = await readMp4Prefix(response);
  if (!isMp4(bytes)) throw new ApiError(422, "invalid_file", "The file does not have a supported MP4 container signature.");
  const { data: assetId, error } = await admin.rpc("finalize_upload", { p_intent: intentId, p_owner: user.id, p_size: size });
  if (error) throw new ApiError(409, "upload_not_finalized", "The upload changed during verification. Refresh your library before retrying.");
  return json({ assetId, videoId }, 201);
}); }
