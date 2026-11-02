"use client";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, Check, FileVideo, FolderOpen, Globe2, LoaderCircle, LockKeyhole, LogOut, RefreshCw, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { browserSupabase } from "@/lib/supabase/browser";
import { requestApi, downloadAsset } from "@/lib/client-api";
import { formatBytes } from "@/lib/utils";
import { isMp4 } from "@/lib/video/mp4";
import { uploadSchema } from "@/lib/validation/upload";
type LibraryVideo = { id: string; title: string; tiktok_video_id: string | null; created_at: string; is_public: boolean; upload_state: string; video_assets: { id: string; file_size: number; is_public: boolean }[]; upload_intents: { id: string; expires_at: string }[] };
type Download = { id: string; video_id: string | null; status: string; created_at: string; videos: { title: string } | null };
type LibraryData = { videos: LibraryVideo[]; downloads: Download[] };
export function Library({ email, maxBytes }: { email: string; maxBytes: number }) {
  const router = useRouter();
  const [library, setLibrary] = useState<LibraryData>({ videos: [], downloads: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [tab, setTab] = useState("uploads");
  async function refresh() {
    setLoading(true);
    try { setLibrary(await requestApi<LibraryData>("/api/library")); }
    catch (error) { setError((error as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    let active = true;
    requestApi<LibraryData>("/api/library").then((data) => { if (active) setLibrary(data); }).catch((error: Error) => { if (active) setError(error.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function action(id: string, operation: () => Promise<void>) {
    setBusy(id); setError(""); setNotice("");
    try { await operation(); await refresh(); }
    catch (error) { setError((error as Error).message); }
    finally { setBusy(null); }
  }
  async function remove(video: LibraryVideo) {
    const result = await requestApi<{ scheduled?: boolean }>(`/api/videos/${video.id}`, { method: "DELETE" });
    setConfirmDelete(null); setNotice(result.scheduled ? "The file is removed and downloads are disabled. Its reservation will be cleaned up after the upload token expires; retry deletion in three hours or wait for scheduled maintenance." : "Video and its stored original were deleted.");
  }
  async function toggleSharing(video: LibraryVideo) {
    const shared = !video.video_assets[0]?.is_public;
    await requestApi(`/api/videos/${video.id}`, { method: "PATCH", body: JSON.stringify({ shared }) });
    setNotice(shared ? "Public downloads are enabled. Anyone who checks the matching TikTok link may download this original." : "Public downloads are disabled. Previously issued links can remain valid for up to 60 seconds. Public metadata visibility is unchanged.");
  }
  return <div className="container"><div className="library-header"><div><span className="section-tag">CREATOR SPACE</span><h1>Your original library.</h1><p>{email} · Your uploads, on your terms.</p></div><Button variant="secondary" onClick={async () => { const { error } = await browserSupabase().auth.signOut(); if (error) { setError("Sign out failed. Please retry."); return; } router.push("/auth"); router.refresh(); }}><LogOut size={15} aria-hidden="true" />Sign out</Button></div>
    {error && <div className="alert error-alert" role="alert">{error}</div>}{notice && <div className="alert" role="status">{notice}</div>}
    <div className="library-layout"><section className="library-main" aria-label="Your videos"><div className="library-tabs" role="tablist" aria-label="Library views"><button id="uploads-tab" role="tab" aria-selected={tab === "uploads"} aria-controls="library-panel" onClick={() => setTab("uploads")}>My uploads ({library.videos.length})</button><button id="history-tab" role="tab" aria-selected={tab === "history"} aria-controls="library-panel" onClick={() => setTab("history")}>Download history</button></div>
      <div id="library-panel" role="tabpanel" aria-labelledby={tab === "uploads" ? "uploads-tab" : "history-tab"}>
      {loading ? <div className="library-empty" role="status"><LoaderCircle className="spin" size={24} /><p>Loading your library…</p></div> : tab === "uploads" ? <>
        {!library.videos.length && <div className="library-empty"><FolderOpen size={32} aria-hidden="true" /><h2>Room for your next original.</h2><p>Upload your first MP4 to keep it private or share a clean source with your audience.</p></div>}
        {library.videos.map((video) => <article className="library-item" key={video.id}><div className="library-item-icon"><FileVideo size={23} aria-hidden="true" /></div><div className="library-item-details"><h3>{video.title}</h3><p>{video.video_assets[0] ? `${formatBytes(video.video_assets[0].file_size)} · MP4` : video.upload_state === "deleting" ? "Deletion needs retry" : "Pending verification"} · {new Date(video.created_at).toLocaleDateString()}</p>
          <span className="sharing-label">{video.video_assets[0]?.is_public ? <><Globe2 size={12} aria-hidden="true" />Public downloads enabled</> : <><LockKeyhole size={12} aria-hidden="true" />Private original</>}</span>{video.tiktok_video_id && <small>TikTok association: {video.tiktok_video_id}</small>}
          <div className="library-item-actions">{video.video_assets[0] && video.upload_state === "ready" && <><Button size="sm" variant="secondary" disabled={!!busy} onClick={() => action(video.id, () => downloadAsset(video.video_assets[0].id))}><ArrowDownToLine size={13} />Download</Button><Button size="sm" variant="secondary" disabled={!!busy} onClick={() => action(video.id, () => toggleSharing(video))}>{video.video_assets[0].is_public ? "Disable public downloads" : "Enable public downloads"}</Button></>}
            {video.upload_intents[0] && video.upload_state === "pending" && <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => action(video.id, async () => { await requestApi("/api/videos/upload/complete", { method: "POST", body: JSON.stringify({ videoId: video.id, intentId: video.upload_intents[0].id }) }); setNotice("Original verified and added to your library."); })}><RefreshCw size={13} />Retry verification</Button>}
            <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => setConfirmDelete(video.id)} aria-label={`Delete ${video.title}`}><Trash2 size={13} />Delete</Button>{busy === video.id && <LoaderCircle size={15} className="spin" aria-label="Working" />}</div>
          {confirmDelete === video.id && <div className="delete-confirm"><p>Delete this original permanently? Its stored file will be removed.</p><div><Button variant="destructive" size="sm" disabled={!!busy} onClick={() => action(video.id, () => remove(video))}>Delete permanently</Button><Button variant="secondary" size="sm" disabled={!!busy} onClick={() => setConfirmDelete(null)}>Keep video</Button></div></div>}
        </div></article>)}
      </> : <><p className="inline-notice">The most recent 30 download links you requested. A link being issued does not confirm a completed transfer.</p>{!library.downloads.length && <div className="library-empty"><ArrowDownToLine size={28} aria-hidden="true" /><h2>No download links yet.</h2><p>Links requested while signed in will appear here.</p></div>}{library.downloads.map((item) => <article className="history-item" key={item.id}><h3>{item.videos?.title || "Original video (private or removed)"}</h3><p>Link issued · {new Date(item.created_at).toLocaleString()}</p></article>)}</>}
      </div><Button variant="ghost" size="sm" disabled={loading} onClick={refresh}><RefreshCw size={13} aria-hidden="true" />Refresh library</Button>
    </section><UploadForm maxBytes={maxBytes} onComplete={async () => { setNotice("Your original is ready. It stays private unless you enabled public downloads."); await refresh(); }} onPending={refresh} /></div>
  </div>;
}
function UploadForm({ maxBytes, onComplete, onPending }: { maxBytes: number; onComplete: () => Promise<void>; onPending: () => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [drag, setDrag] = useState(false);
  async function choose(value?: File) {
    setError(""); setFile(null); setProgress(0);
    if (!value) return;
    if (value.size > maxBytes || value.size < 16) { setError(`Choose an MP4 smaller than ${formatBytes(maxBytes)}.`); return; }
    if (value.type !== "video/mp4" || !/\.mp4$/i.test(value.name) || !isMp4(new Uint8Array(await value.slice(0, 4096).arrayBuffer()))) { setError("Choose a valid MP4 video with a supported container signature."); return; }
    setFile(value); setTitle(value.name.replace(/\.mp4$/i, "").slice(0, 200));
  }
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (!file) { setError("Choose an MP4 to upload."); return; }
    const form = new FormData(event.currentTarget);
    const parsed = uploadSchema.safeParse({ title, filename: file.name, fileSize: file.size, mimeType: file.type, tiktokUrl: String(form.get("tiktokUrl") || "").trim(), rightsAttested: form.get("rights") === "on", publicMetadata: false, shareDownload: form.get("share") === "on" });
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setBusy(true); setProgress(0);
    try {
      const intent = await requestApi<{ intentId: string; videoId: string; signedUrl: string }>("/api/videos/upload/init", { method: "POST", body: JSON.stringify(parsed.data) });
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", intent.signedUrl);
        xhr.setRequestHeader("Content-Type", "video/mp4");
        xhr.setRequestHeader("x-upsert", "false");
        xhr.setRequestHeader("Cache-Control", "max-age=0");
        xhr.timeout = 180000;
        xhr.upload.onprogress = (event) => { if (event.lengthComputable) setProgress(Math.round(event.loaded / event.total * 100)); };
        xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Storage rejected the transfer. Check your pending upload before trying again."));
        xhr.onerror = () => reject(new Error("The upload was interrupted. Check your connection and the pending item in your library."));
        xhr.ontimeout = () => reject(new Error("The transfer timed out. Check your pending upload before trying again."));
        xhr.send(file);
      });
      await requestApi("/api/videos/upload/complete", { method: "POST", body: JSON.stringify({ intentId: intent.intentId, videoId: intent.videoId }) });
      setFile(null); setTitle(""); setProgress(0); (event.target as HTMLFormElement).reset();
      await onComplete();
    } catch (error) { setError((error as Error).message); await onPending(); }
    finally { setBusy(false); }
  }
  return <form className="upload-card" onSubmit={upload} aria-busy={busy}><h2>Add an original.</h2><p>A clean MP4, a title, and your permission. Everything starts private.</p>
    <label className={`dropzone ${drag ? "drag-active" : ""}`} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); if (!busy) void choose(e.dataTransfer.files[0]); }}><Upload size={25} aria-hidden="true" /><strong>{file ? file.name : "Drop your MP4 here"}</strong><span>{file ? formatBytes(file.size) : `or click to browse · Up to ${formatBytes(maxBytes)}`}</span><input aria-label="Choose original MP4" type="file" accept="video/mp4,.mp4" disabled={busy} onChange={(e: ChangeEvent<HTMLInputElement>) => void choose(e.target.files?.[0])} /></label>
    <div className="form-field"><label htmlFor="upload-title">Video title</label><Input id="upload-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required disabled={busy} placeholder="Give your original a name" /></div>
    <div className="form-field"><label htmlFor="upload-link">TikTok video link <span className="form-help">(optional)</span></label><Input id="upload-link" name="tiktokUrl" type="url" placeholder="https://www.tiktok.com/@.../video/..." disabled={busy} /><p className="form-help">An association helps people find your original. It does not verify ownership of the TikTok post.</p></div>
    <label className="checkbox-label"><input type="checkbox" name="rights" disabled={busy} required /><span>I have the rights and permissions to upload this original and grant the access I choose.</span></label>
    <label className="checkbox-label"><input type="checkbox" name="share" disabled={busy} /><span>Allow anyone to download this original. Its title and TikTok association will also become public.</span></label>
    {busy && <><progress className="upload-progress" value={progress} max={100} aria-label="Upload progress" /><p className="form-help" role="status">{progress < 100 ? `Uploading ${progress}%` : "Verifying your stored original…"}</p></>}
    <Button type="submit" disabled={busy || !file}>{busy ? <LoaderCircle size={16} className="spin" /> : file ? <Check size={16} /> : <Upload size={16} />}{busy ? "Uploading original..." : "Upload original"}</Button>
    {error && <p className="alert error-alert" role="alert">{error}</p>}
  </form>;
}
