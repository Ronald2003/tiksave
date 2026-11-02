"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, useReducedMotion } from "motion/react";
import { ArrowDownToLine, ArrowRight, Check, Clipboard, Copy, Film, Link2, LoaderCircle, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tiktokUrlSchema } from "@/lib/validation/tiktok";
import { downloadAsset, requestApi } from "@/lib/client-api";
import { formatBytes } from "@/lib/utils";
import type { VideoResult } from "@/lib/video/types";
const schema = z.object({ url: tiktokUrlSchema });
export function Downloader() {
  const [result, setResult] = useState<VideoResult | null>(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expired, setExpired] = useState(false);
  const reduce = useReducedMotion();
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { url: "" } });
  async function resolve(values: z.infer<typeof schema>) {
    setError(""); setResult(null); setExpired(false); setCopied(false);
    try { setResult(await requestApi<VideoResult>("/api/videos/resolve", { method: "POST", body: JSON.stringify(values) })); }
    catch (error) { setError((error as Error).message); }
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
  async function copy() {
    try { await navigator.clipboard.writeText(result?.canonicalUrl || ""); setCopied(true); }
    catch { setError("Clipboard access is blocked. Copy the video link from the field above."); }
  }
  return <div className="downloader-wrap" id="downloader">
    <form onSubmit={handleSubmit(resolve)} noValidate className="downloader-panel" aria-busy={isSubmitting}>
      <div className="downloader-heading"><span className="step-dot">1</span><label htmlFor="tiktok-url">Your next download starts here</label><span className="format-label">MP4</span></div>
      <div className={`url-field ${errors.url ? "has-error" : ""}`}><Link2 size={21} className="url-icon" aria-hidden="true" />
        <input id="tiktok-url" type="url" inputMode="url" placeholder="Paste TikTok video link here..." autoComplete="off" spellCheck={false} aria-invalid={!!errors.url} aria-describedby={errors.url ? "url-error" : "url-hint"} {...register("url")} disabled={isSubmitting} />
        <Button type="button" variant="secondary" size="sm" onClick={paste} disabled={isSubmitting}><Clipboard size={15} aria-hidden="true" />Paste</Button>
      </div>
      {errors.url && <p className="field-error" id="url-error" role="alert">{errors.url.message}</p>}
      <Button type="submit" disabled={isSubmitting} className="download-submit">{isSubmitting ? <LoaderCircle className="spin" size={19} aria-hidden="true" /> : <ArrowDownToLine size={19} aria-hidden="true" />}{isSubmitting ? "Checking your video..." : "Download"}<ArrowRight size={18} aria-hidden="true" /></Button>
      <div className="input-note" id="url-hint"><ShieldCheck size={14} aria-hidden="true" /><span>No registration or upload needed. Downloads depend on an available permitted source.</span></div>
    </form>
    {error && <div className="alert error-alert" role="alert"><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss message"><X size={17} /></button></div>}
    {isSubmitting && <div className="result-panel result-skeleton" role="status" aria-label="Checking video details and original availability"><div className="skeleton skeleton-thumb" /><div><div className="skeleton skeleton-line" /><div className="skeleton skeleton-line short" /><p>Checking video details and original availability…</p></div></div>}
    {result && <motion.section initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="result-panel" aria-label="Video result" aria-live="polite">
      <div className="result-preview">{result.thumbnailUrl ? <img src={result.thumbnailUrl} alt="Video thumbnail from TikTok" width="100" height="130" referrerPolicy="no-referrer" /> : <div className="empty-thumbnail"><Film size={28} aria-hidden="true" /><span>No preview</span></div>}</div>
      <div className="result-details"><span className={`status-label ${result.status === "ready" ? "status-ready" : ""}`}>{result.status === "ready" ? <><Check size={13} aria-hidden="true" />{result.directDownload ? "Video available" : "Original available"}</> : result.status === "provider_error" ? "Availability not checked" : "Original unavailable"}</span>
        <h2>{result.title || "TikTok video"}</h2>{result.creatorName && <p>{result.creatorName}</p>}<p className="result-id">Video {result.videoId}</p>
        <p>{result.message}</p>{result.resolution && <p>{result.resolution} · MP4</p>}
        <div className="result-actions">{result.directDownload && <Button asChild><a href={result.directDownload.url} download={result.directDownload.filename} rel="noopener noreferrer" onClick={(event) => { if (Date.now() >= result.directDownload!.expiresAt) { event.preventDefault(); setExpired(true); } }}><ArrowDownToLine size={15} aria-hidden="true" />Download MP4</a></Button>}{result.assets?.map((asset) => <Button key={asset.id} size="sm" disabled={!!downloading} onClick={() => download(asset.id)}>{downloading === asset.id ? <LoaderCircle size={15} className="spin" /> : <ArrowDownToLine size={15} />}{asset.label} <span className="download-size">{formatBytes(asset.fileSize)}</span></Button>)}
          <Button variant="secondary" size="sm" onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Copied" : "Copy link"}</Button></div>
        {expired && <p className="field-error" role="alert">This download link expired. Press Download above to get a fresh link.</p>}
      </div>
    </motion.section>}
  </div>;
}
