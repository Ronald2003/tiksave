import "server-only";
import { serverSupabase } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/security/errors";
import { canDownload } from "./resolvers/original";
import type { DownloadAsset } from "./types";
export async function createDownload(assetId: string) {
  const db = await serverSupabase();
  const { data: { user } } = await db.auth.getUser();
  const { data, error } = await db.from("video_assets").select("*, videos!inner(title, upload_state)").eq("id", assetId).eq("videos.upload_state", "ready").maybeSingle();
  if (error) throw new ApiError(503, "storage_unavailable", "Download authorization could not be checked.");
  if (!data || !canDownload(data as DownloadAsset, user?.id)) throw new ApiError(404, "asset_unavailable", "This original is unavailable or you do not have permission to download it.");
  const admin = adminSupabase();
  const { error: missing } = await admin.storage.from("originals").info(data.storage_path);
  if (missing) throw new ApiError(410, "file_unavailable", "The original file is no longer available. Contact the uploader.");
  const filename = `${String(data.videos.title).normalize("NFKD").replace(/[^a-zA-Z0-9 _-]/g, "").trim().slice(0, 80) || "tiksave-original"}.mp4`;
  const { data: signed, error: signError } = await admin.storage.from("originals").createSignedUrl(data.storage_path, 60, { download: filename });
  if (signError || !signed) throw new ApiError(503, "storage_unavailable", "A download link could not be created. Try again.");
  if (user) {
    const { error: historyError } = await admin.from("downloads").insert({ video_id: data.video_id, user_id: user.id, status: "link_issued" });
    if (historyError) throw new ApiError(503, "history_unavailable", "Download history could not be saved. Please try again.");
  }
  return { url: signed.signedUrl, expiresIn: 60, filename };
}
