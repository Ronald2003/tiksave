import Link from "next/link";
import { ArrowDownToLine, ArrowUpRight } from "lucide-react";
export const disclaimer = "TikSave is an independent service and is not affiliated with TikTok. Users are responsible for ensuring they have the rights and permissions required to download, store, and reuse video content.";
export function Footer() { return <footer className="footer"><div className="container">
  <div className="footer-top"><div><Link className="brand" href="/"><ArrowDownToLine size={21} aria-hidden="true" />TikSave<span className="brand-period">.</span></Link><p>Your content. In its original form.</p></div>
    <nav aria-label="Footer navigation"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/contact">Contact <ArrowUpRight size={13} aria-hidden="true" /></Link><a href="https://github.com/imputnet/cobalt" target="_blank" rel="noopener noreferrer">Cobalt</a></nav></div>
  <div className="footer-bottom"><p>{disclaimer}</p><span>© {new Date().getFullYear()} TikSave</span></div>
  </div></footer>; }
