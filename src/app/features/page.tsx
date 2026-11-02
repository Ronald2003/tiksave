import type { Metadata } from "next";
import { FeatureSection } from "@/components/content";
export const metadata: Metadata = { title: "Features", alternates: { canonical: "/features" } };
export default function FeaturesPage() { return <div className="content-page"><div className="container page-intro"><span className="section-tag">THOUGHTFULLY SIMPLE</span><h1>Paste a link. Check availability.</h1><p>No registration or file upload is needed to use the downloader. A download is offered only when a permitted MP4 source is available.</p></div><FeatureSection /></div>; }
