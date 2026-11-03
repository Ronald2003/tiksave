import Link from "next/link";
import { VectorArt } from "./vector-art";
import { ArrowUpRight, ChevronDown } from "lucide-react";

export const faqs = [
  ["Can I download every video?", "No. The backend checks for media available from a public post. Removed, restricted, unsupported, or temporarily inaccessible posts may fail. TikSave does not remove or detect watermarks and cannot promise every returned file is watermark-free."],
  ["Do I need to create an account?", "No. Paste a supported video link, check availability, and download the available videos or photos without registering or uploading a file. Download only content you have permission to save."],
  ["Why is a download sometimes unavailable?", "A link identifies a post, but it does not supply an accessible MP4 file. If no permitted source is available, there is no download to offer. Creating an account or uploading a file is not required to use this downloader."],
  ["Can I download in HD?", "Quality depends on the source file. Downloads request up to 1080p. We do not invent HD choices, upscale videos, or promise a resolution we cannot verify."],
  ["Which platforms are supported?", "Use an HTTPS video or photo-post link from TikTok, Facebook, Instagram, X, Vimeo, Reddit, Bluesky, Dailymotion, Pinterest, Twitch clips, or Streamable. Facebook videos must be publicly accessible. Private, restricted, removed, and inaccessible content may not resolve."],
  ["Does TikSave remove a watermark from a file?", "No. TikSave uses media supplied by the source. It does not remove TikTok or creator watermarks. A public link is not proof of ownership or a license to reuse a video."],
];
export function FaqSection({ full = false }: { full?: boolean }) {
  return <section className="faq-section container" id="faq"><div className="faq-intro"><VectorArt kind="chat" className="faq-art"/><span className="section-tag">A LITTLE CLARITY</span><h2>Good questions.<br />Straight answers.</h2><p>Everything you need to know before your first download.</p>{!full && <Link href="/faq" className="text-link">All your questions, answered <ArrowUpRight size={15} aria-hidden="true" /></Link>}</div><div className="faq-list">{(full ? faqs : faqs.slice(0, 4)).map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown size={17} aria-hidden="true" /></summary><p>{answer}</p></details>)}</div></section>;
}
export function HowSection() {
  const steps = [
    { title: "Find the moment", text: "Open a video on a supported platform, tap Share, and copy its link.", art: "link" as const },
    { title: "Drop in the link", text: "Paste it above. We check the link and request an available video.", art: "shield" as const },
    { title: "Keep the original", text: "If an MP4 is available, download it straight to your device.", art: "download" as const },
  ];
  return <section className="how-section container" id="how-it-works"><div className="section-heading"><h2>A link. A check. Your video.</h2><p>Three simple steps, with permissions built in.</p></div><div className="steps">{steps.map(({ title, text, art }, i) => <article className="step" key={title}><div className="step-top"><span className="step-number">0{i + 1}</span><VectorArt kind={art}/></div><h3>{title}</h3><p>{text}</p></article>)}</div></section>;
}
export function FeatureSection() { return <section className="feature-section container" id="features"><div className="section-heading"><h2>The original is the whole point.</h2><p>Less friction. More control. No promises we can’t keep.</p></div><div className="feature-grid">
  <article className="feature-card feature-main"><VectorArt kind="file" className="feature-art"/><h3>The available MP4. Ready to save.</h3><p>Download the video supplied by the source. TikSave does not upscale it or remove watermarks.</p><div className="feature-meta"><span>MP4 FORMAT</span><span>SOURCE QUALITY</span></div></article>
  <article className="feature-card feature-tint"><VectorArt kind="browser" className="feature-art"/><h3>Your browser is all you need.</h3><p>Check a link right in your browser, or install TikSave on your home screen. No account required.</p><span className="small-note">Made for your phone and your desktop <ArrowUpRight size={14} aria-hidden="true" /></span></article>
  </div></section>; }
