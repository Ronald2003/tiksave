"use client";
import dynamic from "next/dynamic";
const Editor=dynamic(()=>import("./pdf-editor").then(m=>m.PdfEditor),{ssr:false,loading:()=> <p role="status">Loading PDF tools…</p>});
const Convert=dynamic(()=>import("./converter").then(m=>m.Converter),{ssr:false,loading:()=> <p role="status">Loading converter…</p>});
export function DocumentTool({mode}:{mode:"pdf-to-word"|"word-to-pdf"|"pdf-editor"}) {
  return mode==="pdf-editor"?<Editor/>:<Convert mode={mode}/>;
}
