import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { VectorArt } from "@/components/vector-art";
import { documentTools } from "@/lib/tool-catalog";
export const metadata:Metadata={title:"Document tools",alternates:{canonical:"/tools"}};
export default function ToolsPage() {
  return <div className="container tools-page"><div className="tools-intro"><span className="section-tag">A FEW USEFUL EXTRAS</span><h1>Your documents.<br/>A little less work.</h1><p>Convert a file, mark up a PDF, then get back to what matters.</p><span className="local-badge"><ShieldCheck size={16} aria-hidden="true"/>On your device. No upload. No account.</span></div>
    <div className="tool-cards">{documentTools.map((tool,index)=><Link href={`/tools/${tool.slug}`} key={tool.slug} className="tool-card"><div className="tool-card-top"><span>0{index+1} / {tool.label}</span><ArrowUpRight size={22} aria-hidden="true"/></div><VectorArt kind={index===2?"browser":"file"} label={index===0?".docx":".pdf"} className="tool-card-art"/><h2>{tool.title}</h2><p>{tool.description}</p><small>{tool.note}</small></Link>)}</div>
    <p className="tool-footnote">The downloader is still right where you left it. <Link href="/" className="text-link">Back to downloader →</Link> · <a href="/document-licenses.txt">Open-source licenses</a></p>
  </div>;
}
