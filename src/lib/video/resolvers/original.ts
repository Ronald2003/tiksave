import "server-only";
import { publicConfig } from "@/lib/env";
import { serverSupabase } from "@/lib/supabase/server";
import { ApiError } from "@/lib/security/errors";
import type { DownloadAsset, VideoResult } from "@/lib/video/types";
export function canDownload(asset: Pick<DownloadAsset, "authorization_status" | "is_public" | "owner_id">, userId?: string) {
  return asset.authorization_status === "authorized" && (asset.is_public || asset.owner_id === userId);
}
export function availability(assets: DownloadAsset[], metadata: Omit<VideoResult, "status">): VideoResult {
  if (!assets.length) return { ...metadata, status: "clean_source_unavailable", assets: [], message: "Watermark-free original unavailable for this video." };
  const [first] = assets;
  return { ...metadata, status: "ready", fileSizeBytes: first.file_size,
    resolution: first.width && first.height ? `${first.width} × ${first.height}` : undefined,
    availableQualities: ["Original MP4"], assets: [{ id: first.id, label: "Download MP4", fileSize: first.file_size }],
    message: "A creator-authorized original is available. The file is provided as uploaded, without transcoding.",
  };
}
export async function resolveOriginals(videoId: string) {
  if (!publicConfig()) return [] as DownloadAsset[];
  const db = await serverSupabase();
  const { data, error } = await db.from("video_assets").select("*, videos!inner(tiktok_video_id)").eq("videos.tiktok_video_id", videoId).eq("authorization_status", "authorized").limit(10);
  if (error) throw new ApiError(503, "storage_unavailable", "Original availability could not be checked. Please try again.");
  return (data || []) as DownloadAsset[];
}
