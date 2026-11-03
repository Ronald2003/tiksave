"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { pdfToWord, readDocument, saveFile, wordToPdf } from "@/lib/documents";
export function Converter({ mode }: { mode:"pdf-to-word"|"word-to-pdf" }) {
  const [file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false),[status,setStatus]=useState(""),[error,setError]=useState("");
  const host=useRef<HTMLDivElement>(null);
  const toWord=mode==="pdf-to-word";
  async function convert() {
    if(!file||busy)return;setBusy(true);setError("");setStatus("Opening your document…");
    try {
      const bytes=await readDocument(file,toWord?".pdf":".docx");
      const result=toWord?await pdfToWord(bytes,setStatus):await wordToPdf(bytes,host.current!,setStatus);
      saveFile(result.bytes,file.name.replace(/\.(?:pdf|docx)$/i,"")+(toWord?".docx":".pdf"),toWord?"application/vnd.openxmlformats-officedocument.wordprocessingml.document":"application/pdf");
      setStatus("emptyPages" in result&&result.emptyPages?`Saved Word document. ${result.emptyPages} page(s) had no extractable text and are marked for OCR.`:"Conversion finished. Your download is ready.");
    } catch(e) {setError(e instanceof Error?e.message:"This file could not be converted. Try a simpler, unencrypted document.");setStatus("");} finally {setBusy(false);}
  }
  return <div className="document-workbench converter-box"><label className="file-drop">Choose {toWord?"PDF":"Word (.docx)"} · up to 20 MB / 60 pages<input type="file" accept={toWord?".pdf,application/pdf":".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"} disabled={busy} onChange={e=>{setFile(e.target.files?.[0]||null);setError("");setStatus("");}} /></label>
    {file&&<p>{file.name} · {(file.size/1024/1024).toFixed(2)} MB</p>}
    <Button disabled={!file||busy} onClick={()=>void convert()}>{busy?"Converting…":`Convert to ${toWord?"Word":"PDF"}`}</Button>
    <p role="status" className="tool-status">{status}</p>{error&&<p role="alert" className="tool-error">{error}</p>}
    <p className="tool-footnote">{toWord?"Creates editable text from text-based PDFs. Images, tables, columns and exact styling are not reconstructed. Scanned pages need OCR, which is not included.":"Creates a flattened PDF of the rendered Word pages. Text will not be selectable. Complex layouts, fonts and page breaks may differ from Microsoft Word; check the output before sharing. Legacy .doc files are not supported."}</p>
    <p className="tool-footnote">Your document is processed in this tab and is not uploaded. Large files may be slow on phones.</p><div ref={host} className="conversion-render-host" aria-hidden="true" />
  </div>;
}
