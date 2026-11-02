import type { Metadata } from "next";
import Link from "next/link";
import { HowSection } from "@/components/content";
import { Button } from "@/components/ui/button";
export const metadata: Metadata = { title: "How it works", alternates: { canonical: "/how-it-works" } };
export default function HowPage() { return <div className="content-page">
  <div className="container page-intro"><span className="section-tag">FROM LINK TO VIDEO</span><h1>Copy. Paste. Download.</h1><p>No registration or file upload is required. Use only videos you have permission to download.</p></div>
  <HowSection /><div className="container prose">
    <h2>What happens when you check a link?</h2><p>We validate the TikTok address and safely resolve supported short links. When available, TikTok supplies a title, creator name, and thumbnail through its documented metadata endpoint.</p>
    <p>The configured Cobalt backend checks the public post for accessible media. Cobalt is a separate, unofficial open-source service. It parses public web pages and does not independently verify ownership or licensing. This app adds no login, age restriction, or CAPTCHA bypass.</p>
    <h2>When a video is available</h2><p>Download MP4 opens a short-lived media link directly on the backend. Video bytes do not pass through Netlify functions. If the link expires, press Download in the input form again.</p>
    <h2>When a video is unavailable</h2><p>Removed, restricted, unsupported, and temporarily inaccessible posts can fail. We show the error instead of creating a fake download. Signing in or uploading a file is not required.</p>
    <h2>Formats and quality</h2><p>The downloader offers a source MP4 when available. Quality, codecs, and watermark presence depend on that file. We do not remove watermarks, upscale, or invent HD versions. Slideshow processing is not included.</p>
    <Button asChild><Link href="/#downloader">Check a video link</Link></Button>
  </div></div>; }
