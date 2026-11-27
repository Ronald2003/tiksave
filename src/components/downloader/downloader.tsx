"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, useReducedMotion } from "motion/react";
import { ArrowDownToLine, ArrowRight, Check, Clipboard, Film, Link2, LoaderCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { videoUrlSchema } from "@/lib/validation/video";
import { downloadAsset, requestApi } from "@/lib/client-api";
import { ApiError } from "@/lib/security/errors";
import { formatBytes } from "@/lib/utils";
import type { VideoResult } from "@/lib/video/types";
const schema = z.object({ url: videoUrlSchema });
export function Downloader() {
  const [result, setResult] = useState<VideoResult | null>(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [waitingForServer, setWaitingForServer] = useState(false);
  const reduce = useReducedMotion();
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { url: "" } });
  async function resolve(values: z.infer<typeof schema>) {
    setError(""); setResult(null); setExpired(false);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90_000);
    const { signal } = controller;
    const options = { method: "POST", body: JSON.stringify(values), signal };
    try {
      while (!signal.aborted) {
        try {
          const next = await requestApi<VideoResult>("/api/videos/resolve", options);
          setResult(next);
          if (next.status === "ready") setValue("url", "", { shouldValidate: false, shouldDirty: false });
          return;
        } catch (error) {
          if (signal.aborted || !(error instanceof ApiError) || error.code !== "provider_unreachable") throw error;
          setWaitingForServer(true);
          await new Promise<void>(resolve => {
            const timer = setTimeout(() => {
              signal.removeEventListener("abort", stopWaiting);
              resolve();
            }, 5000);
            function stopWaiting() {
              clearTimeout(timer);
              resolve();
            }
            signal.addEventListener("abort", stopWaiting, { once: true });
          });
        }
      }
    } catch (error) {
      if (!signal.aborted) { setError((error as Error).message); return; }
    } finally {
      clearTimeout(timeout);
      setWaitingForServer(false);
    }
    setError("The download server took too long to respond. Press Download to try again.");
  }
  async function paste() {
    setError("");
    try {
      if (!navigator.clipboard?.readText) throw new Error();
      setValue("url", (await navigator.clipboard.readText()).trim(), { shouldValidate: true, shouldDirty: true });
    } catch { setError("Clipboard access is blocked by your browser. Tap the link field and paste with your keyboard or long-press menu."); }
  }
  async function download(id: string) {
    setDownloading(id); setError("");
    try { await downloadAsset(id); } catch (error) { setError((error as Error).message); }
    finally { setDownloading(null); }
  }
  return <div className="downloader-wrap" id="downloader">
    <form onSubmit={handleSubmit(resolve)} noValidate className="downloader-panel" aria-busy={isSubmitting}>
      <div className="downloader-heading"><span className="step-dot">1</span><label htmlFor="tiktok-url">Your next download starts here</label><span className="format-label">VIDEO / PHOTO</span></div>
      <div className={`url-field ${errors.url ? "has-error" : ""}`}><Link2 size={21} className="url-icon" aria-hidden="true" />
        <input id="tiktok-url" type="url" inputMode="url" placeholder="Paste a video or photo link here..." autoComplete="off" spellCheck={false} aria-invalid={!!errors.url} aria-describedby={errors.url ? "url-error" : undefined} {...register("url")} disabled={isSubmitting} />
        <Button type="button" variant="secondary" size="sm" onClick={paste} disabled={isSubmitting}><Clipboard size={15} aria-hidden="true" />Paste</Button>
      </div>
      {errors.url && <p className="field-error" id="url-error" role="alert">{errors.url.message}</p>}
      <Button type="submit" disabled={isSubmitting} className="download-submit">{isSubmitting ? <LoaderCircle className="spin" size={19} aria-hidden="true" /> : <ArrowDownToLine size={19} aria-hidden="true" />}{waitingForServer ? "Waiting for server…" : isSubmitting ? "Checking your link..." : "Download"}<ArrowRight size={18} aria-hidden="true" /></Button>
    </form>
    {error && <div className="alert error-alert" role="alert"><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss message"><X size={17} /></button></div>}
    {isSubmitting && <div className="result-panel result-skeleton" role="status"><div className="skeleton skeleton-thumb" aria-hidden="true" /><div><div className="skeleton skeleton-line" aria-hidden="true" /><div className="skeleton skeleton-line short" aria-hidden="true" />{waitingForServer ? <><strong>Waking up the download server…</strong><p>This can take about a minute. We’ll check your link automatically when it’s ready.</p></> : <p>Checking your link…</p>}</div></div>}
    {result && <motion.section initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="result-panel" aria-label="Download result" aria-live="polite">
      {!result.images && !result.videos && (<div className="result-preview">{result.thumbnailUrl ? <img src={result.thumbnailUrl} alt="Video thumbnail" width="100" height="130" referrerPolicy="no-referrer" /> : <div className="empty-thumbnail"><Film size={28} aria-hidden="true" /><span>No preview</span></div>}</div>)}
      <div className="result-details"><span className={`status-label ${result.status === "ready" ? "status-ready" : ""}`}>{result.status === "ready" ? <><Check size={13} aria-hidden="true" />{result.videos ? "Post media available" : result.images ? `${result.images.length} photos available` : result.directDownload ? "Video available" : "Original available"}</> : result.status === "provider_error" ? "Availability not checked" : "Original unavailable"}</span>
        <h2>{result.title || (result.videos ? "Post collection" : result.images ? "Photo collection" : "Video")}</h2>{result.creatorName && <p>{result.creatorName}</p>}{result.videoId && <p className="result-id">Video {result.videoId}</p>}
        {result.message && <p>{result.message}</p>}{result.resolution && <p>{result.resolution} · MP4</p>}
        {result.images && <div className="photo-results">{result.images.map((image, index) => <div key={image.url}><img src={image.url} alt={`Photo ${index + 1}`} loading="lazy" referrerPolicy="no-referrer" /><Button asChild size="sm"><a href={image.url} download={image.filename} rel="noopener noreferrer" onClick={(event) => { if (Date.now() >= image.expiresAt) { event.preventDefault(); setExpired(true); } }}><ArrowDownToLine size={15} aria-hidden="true" />Save image {index + 1}</a></Button></div>)}</div>}
        {result.videos && <div className="photo-results">{result.videos.map((video,index)=><div key={video.url}>{video.thumbnailUrl?<img src={video.thumbnailUrl} alt={`Video ${index+1} preview`} loading="lazy" referrerPolicy="no-referrer"/>:<Film size={35} aria-hidden="true"/>}<Button asChild size="sm"><a href={video.url} download={video.filename} rel="noopener noreferrer" onClick={event=>{if(Date.now()>=video.expiresAt){event.preventDefault();setExpired(true);}}}><ArrowDownToLine size={15} aria-hidden="true"/>Save video {index+1}</a></Button></div>)}</div>}
        <div className="result-actions">{result.directDownload && <Button asChild><a href={result.directDownload.url} download={result.directDownload.filename} rel="noopener noreferrer" onClick={(event) => { if (Date.now() >= result.directDownload!.expiresAt) { event.preventDefault(); setExpired(true); } }}><ArrowDownToLine size={15} aria-hidden="true" />Download MP4</a></Button>}{result.assets?.map((asset) => <Button key={asset.id} size="sm" disabled={!!downloading} onClick={() => download(asset.id)}>{downloading === asset.id ? <LoaderCircle size={15} className="spin" /> : <ArrowDownToLine size={15} />}{asset.label} <span className="download-size">{formatBytes(asset.fileSize)}</span></Button>)}</div>
        {expired && <p className="field-error" role="alert">This download link expired. Paste the original post link above and press Download to get fresh links.</p>}
      </div>
    </motion.section>}
  </div>;
}
