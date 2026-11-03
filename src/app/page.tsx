import { ArrowDownToLine, Check, CirclePlay, LockKeyhole } from "lucide-react";
import { Downloader } from "@/components/downloader/downloader";
import { FaqSection, FeatureSection, HowSection } from "@/components/content";
import Link from "next/link";
import { siteUrl } from "@/lib/env";
export default function Home() {
  const structured = { "@context": "https://schema.org", "@type": "WebApplication", name: "TikSave", url: siteUrl(), applicationCategory: "MultimediaApplication", operatingSystem: "Web browser", description: "Video link analysis and available MP4 downloads." };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, "\\u003c") }} />
    <section className="hero"><div className="container hero-inner"><div className="hero-eyebrow"><span className="eyebrow-icon"><ArrowDownToLine size={13} aria-hidden="true" /></span>KEEP THE ORIGINAL</div>
      <h1>Your favorite videos.<br /><span>Ready to save.</span></h1>
      <p className="hero-description">TikTok, Facebook, Instagram, and more. Paste a video or photo-post link to find available downloads. Save only content you have permission to download.</p>
      <Downloader />
      <div className="hero-benefits"><span><Check size={15} aria-hidden="true" />Original MP4 quality</span><span><LockKeyhole size={14} aria-hidden="true" />Permission comes first</span></div>
      <Link className="how-link" href="/how-it-works"><CirclePlay size={17} aria-hidden="true" />New here? See how it works</Link>
    </div></section>
    <div className="principle-strip"><div className="container"><span>A BETTER WAY TO SAVE</span><p>Made for the moments worth keeping.<span> Built around the people who create them.</span></p></div></div>
    <HowSection /><FeatureSection /><FaqSection />
  </>;
}
