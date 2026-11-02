import type { Metadata } from "next";
import { FaqSection } from "@/components/content";
export const metadata: Metadata = { title: "Frequently asked questions", alternates: { canonical: "/faq" } };
export default function FaqPage() { return <div className="content-page"><div className="container page-intro"><h1>Before you hit download.</h1><p>Honest answers about originals, quality, and permissions.</p></div><FaqSection full /></div>; }
