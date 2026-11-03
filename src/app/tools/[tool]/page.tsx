import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { documentTools } from "@/lib/tool-catalog";
import { DocumentTool } from "@/components/tools/document-tool";
export function generateStaticParams(){return documentTools.map(tool=>({tool:tool.slug}));}
export async function generateMetadata({params}:{params:Promise<{tool:string}>}):Promise<Metadata>{const {tool}=await params;const info=documentTools.find(item=>item.slug===tool);return {title:info?.title||"Tools",alternates:{canonical:`/tools/${tool}`}};}
export default async function ToolPage({params}:{params:Promise<{tool:string}>}) {
  const {tool}=await params,info=documentTools.find(item=>item.slug===tool);if(!info)notFound();
  return <div className="container tools-page"><Link href="/tools" className="text-link">← All tools</Link><div className="tool-page-intro"><span className="section-tag">{info.label}</span><h1>{info.title}</h1><p>{info.description}</p></div><DocumentTool mode={info.slug}/></div>;
}
