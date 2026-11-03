export type VideoStatus = "ready" | "clean_source_unavailable" | "invalid_url" | "video_not_found" | "authorization_required" | "rate_limited" | "provider_error";
export interface DownloadAsset {
  id: string; video_id: string; file_size: number; width: number | null; height: number | null;
  authorization_status: string; is_public: boolean; owner_id: string; storage_path: string;
}
export interface VideoResult {
  status: VideoStatus; videoId?: string; canonicalUrl?: string; title?: string; creatorName?: string;
  thumbnailUrl?: string; durationSeconds?: number; resolution?: string; fileSizeBytes?: number;
  availableQualities?: string[]; assets?: { id: string; label: string; fileSize: number }[]; message?: string;
  images?: { url: string; filename: string; expiresAt: number }[];
  videos?: { url: string; filename: string; expiresAt: number; thumbnailUrl?: string }[];
  directDownload?: { url: string; filename: string; expiresAt: number };
}
