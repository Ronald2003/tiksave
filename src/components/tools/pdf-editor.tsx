"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { arrangePdf, markPdf, mergePdf, openPdf, pageOrder, pdfViewer, readDocument, rotatePdf, saveFile } from "@/lib/documents";

export function PdfEditor() {
  const [bytes,setBytes]=useState<Uint8Array|null>(null), [previous,setPrevious]=useState<Uint8Array|null>(null);
  const [page,setPage]=useState(0), [count,setCount]=useState(0), [busy,setBusy]=useState(false);
  const [error,setError]=useState(""), [notice,setNotice]=useState("Choose a PDF to begin."), [name,setName]=useState("document");
  const [previewReady,setPreviewReady]=useState(false);
  const [tool,setTool]=useState("text"), [text,setText]=useState(""), [size,setSize]=useState(16), [color,setColor]=useState("#111111");
  const [order,setOrder]=useState(""), [image,setImage]=useState<Uint8Array|null>(null);
  const [positionX,setPositionX]=useState(25),[positionY,setPositionY]=useState(25);
  const canvas=useRef<HTMLCanvasElement>(null), signature=useRef<HTMLCanvasElement>(null);
  const viewport=useRef<{width:number;height:number;convertToPdfPoint:(x:number,y:number)=>number[]}|null>(null);
  const start=useRef<number[]|null>(null), drawing=useRef(false);
  useEffect(()=>{
    if(!bytes) return;
    let cancelled=false;
    let viewer: Awaited<ReturnType<typeof pdfViewer>>|undefined;
    let renderTask:{cancel:()=>void}|undefined;
    viewport.current=null;
    void (async()=>{
      viewer=await pdfViewer(bytes);
      if(cancelled) return;
      const source=await viewer.getPage(page+1), initial=source.getViewport({scale:1});
      const view=source.getViewport({scale:Math.min(1.5,900/initial.width)});
      const target=canvas.current; if(!target||cancelled) return;
      target.width=Math.ceil(view.width); target.height=Math.ceil(view.height);
      const render=source.render({canvas:target,canvasContext:target.getContext("2d")!,viewport:view});
      renderTask=render;
      await render.promise;
      if(!cancelled) { viewport.current=view;setPreviewReady(true); }
    })().catch(e=>{if(!cancelled)setError(e instanceof Error?e.message:"Could not render this PDF.");}).finally(()=>{if(cancelled)void viewer?.loadingTask.destroy();});
    return ()=>{cancelled=true;viewport.current=null;renderTask?.cancel();void viewer?.loadingTask.destroy();};
  },[bytes,page]);
  async function run(action:()=>Promise<void>) {
    setBusy(true);setError("");
    try {await action();} catch(e) {setError(e instanceof Error?e.message:"This PDF could not be edited. Try an unencrypted PDF.");} finally{setBusy(false);}
  }
  async function update(next:Uint8Array, message:string) {
    const pdf=await openPdf(next); setPreviewReady(false);setPrevious(bytes);setBytes(next);setCount(pdf.getPageCount());setPage(p=>Math.min(p,pdf.getPageCount()-1));setNotice(message);
  }
  async function load(file?:File) {if(file) await run(async()=>{
    const next=await readDocument(file,".pdf"), pdf=await openPdf(next);
    setPreviewReady(false);setBytes(next);setPrevious(null);setPage(0);setCount(pdf.getPageCount());setName(file.name.replace(/\.pdf$/i,""));setOrder("");setNotice("Choose a tool, then click or drag on the page. Download when finished.");
  });}
  function point(event:React.PointerEvent<HTMLCanvasElement>) {
    const view=viewport.current, rect=event.currentTarget.getBoundingClientRect();
    return view?.convertToPdfPoint((event.clientX-rect.left)*view.width/rect.width,(event.clientY-rect.top)*view.height/rect.height);
  }
  async function place(event:React.PointerEvent<HTMLCanvasElement>) {
    const end=point(event), begin=start.current;start.current=null;
    if(!end||!begin)return;
    await applyAt(begin,end);
  }
  async function applyAt(begin:number[],end:number[]) {
    if(!bytes||busy)return;
    await run(async()=>{
      if(tool==="image"&&!image)throw new Error("Choose an image or use your drawn signature first.");
      const mark=tool==="text"?{kind:"text" as const,text,size,color}:tool==="highlight"?{kind:"highlight" as const,x2:end[0],y2:end[1]}:{kind:"image" as const,data:image!};
      await update(await markPdf(bytes,page,begin[0],begin[1],mark),"Change applied. Download the edited PDF to keep it.");
    });
  }
  function draw(event:React.PointerEvent<HTMLCanvasElement>) {
    if(!drawing.current)return;
    const c=event.currentTarget, r=c.getBoundingClientRect(), context=c.getContext("2d")!;
    context.lineWidth=3;context.lineCap="round";context.strokeStyle="#111111";
    context.lineTo((event.clientX-r.left)*c.width/r.width,(event.clientY-r.top)*c.height/r.height);context.stroke();
  }
  return <div className="document-workbench">
    <label className="file-drop">Open PDF · up to 20 MB / 60 pages<input type="file" accept=".pdf,application/pdf" disabled={busy} onChange={e=>{void load(e.target.files?.[0]);e.target.value="";}} /></label>
    <p role="status" className="tool-status">{busy?"Working on your document…":notice}</p>
    {error&&<p className="tool-error" role="alert">{error}</p>}
    {bytes&&<>
      <div className="editor-bar"><label>Page<select value={page} disabled={busy} onChange={e=>{setPreviewReady(false);setPage(Number(e.target.value));}}>{Array.from({length:count},(_,i)=><option key={i} value={i}>{i+1} of {count}</option>)}</select></label>
        <Button size="sm" variant="secondary" disabled={busy} onClick={()=>void run(async()=>update(await rotatePdf(bytes,page),"Page rotated."))}>Rotate 90°</Button>
        <Button size="sm" variant="secondary" disabled={busy||count<2} onClick={()=>void run(async()=>update(await arrangePdf(bytes,Array.from({length:count},(_,i)=>i).filter(i=>i!==page)),"Page removed."))}>Remove page</Button>
        <Button size="sm" variant="secondary" disabled={busy||!previous} onClick={()=>void run(async()=>{const last=previous!;await update(last,"Last change undone.");setPrevious(null);})}>Undo</Button>
        <Button disabled={busy} onClick={()=>saveFile(bytes,`${name}-edited.pdf`)}>Download PDF</Button>
      </div>
      <div className="editor-layout"><div className="editor-controls">
        <fieldset disabled={busy}><legend>Annotate this page</legend><label>Tool<select value={tool} onChange={e=>setTool(e.target.value)}><option value="text">Add text</option><option value="highlight">Highlight area</option><option value="image">Image / signature</option></select></label>
        {tool==="text"&&<><label>Text<input value={text} maxLength={500} onChange={e=>setText(e.target.value)} placeholder="Text to place on the PDF" /></label><div className="tool-row"><label>Size<input type="number" min={6} max={72} value={size} onChange={e=>setSize(Number(e.target.value))} /></label><label>Color<input type="color" value={color} onChange={e=>setColor(e.target.value)} /></label></div><small>Click the page to place text. Latin characters supported.</small></>}
        {tool==="highlight"&&<small>Drag over an area to highlight it. Highlighting does not remove or redact underlying text.</small>}
        {tool==="image"&&<><label>PNG or JPEG<input type="file" accept="image/png,image/jpeg" onChange={e=>{const f=e.target.files?.[0];if(f)void run(async()=>{if(f.size>5*1024*1024||!/^image\/(png|jpeg)$/.test(f.type))throw new Error("Choose a PNG or JPEG up to 5 MB.");setImage(new Uint8Array(await f.arrayBuffer()));setNotice("Image ready. Click the page to place it.");});e.target.value="";}} /></label>
          <label>Or draw your signature<canvas ref={signature} width={500} height={160} className="signature-pad" onPointerDown={e=>{drawing.current=true;e.currentTarget.setPointerCapture(e.pointerId);e.currentTarget.getContext("2d")!.beginPath();draw(e);}} onPointerMove={draw} onPointerUp={()=>{drawing.current=false;}} onPointerCancel={()=>{drawing.current=false;}} aria-label="Draw signature" /></label>
          <div className="tool-row"><Button size="sm" variant="secondary" onClick={()=>signature.current?.getContext("2d")?.clearRect(0,0,500,160)}>Clear drawing</Button><Button size="sm" onClick={()=>void run(async()=>{const c=signature.current;if(!c)return;const blob=await new Promise<Blob>((resolve,reject)=>c.toBlob(value=>value?resolve(value):reject(new Error("Could not save the signature drawing.")),"image/png"));setImage(new Uint8Array(await blob.arrayBuffer()));setNotice("Signature ready. Click the page to place it.");})}>Use signature</Button></div><small>Visual signature only; not a certificate-based digital signature.</small>
        </>}
        <div className="tool-row"><label>Left (%)<input type="number" min={0} max={95} value={positionX} onChange={e=>setPositionX(Number(e.target.value))}/></label><label>Top (%)<input type="number" min={0} max={95} value={positionY} onChange={e=>setPositionY(Number(e.target.value))}/></label></div><Button size="sm" variant="secondary" disabled={!previewReady||busy} onClick={()=>{const v=viewport.current;if(v&&Number.isFinite(positionX)&&Number.isFinite(positionY)&&positionX>=0&&positionX<=95&&positionY>=0&&positionY<=95)void applyAt(v.convertToPdfPoint(v.width*positionX/100,v.height*positionY/100),v.convertToPdfPoint(v.width*Math.min(positionX+20,100)/100,v.height*Math.min(positionY+3,100)/100));}}>Place at position</Button>
        </fieldset>
        <fieldset disabled={busy}><legend>Page order / split</legend><label>Pages<input value={order} onChange={e=>setOrder(e.target.value)} placeholder={`1-${count}`} /></label><small>Example: 3,1,2 to reorder; 1-3,5 to select pages.</small><div className="tool-row"><Button size="sm" variant="secondary" onClick={()=>void run(async()=>update(await arrangePdf(bytes,pageOrder(order,count)),"Selected pages applied in the requested order."))}>Apply order</Button><Button size="sm" variant="secondary" onClick={()=>void run(async()=>saveFile(await arrangePdf(bytes,pageOrder(order,count)),`${name}-selected.pdf`))}>Save selected</Button></div></fieldset>
        <fieldset disabled={busy}><legend>Merge PDFs</legend><label>Add PDF files<input type="file" accept=".pdf,application/pdf" multiple onChange={e=>{const files=Array.from(e.target.files||[]);if(files.length)void run(async()=>update(await mergePdf(bytes,files),"PDFs merged in the selected file order."));e.target.value="";}} /></label></fieldset>
      </div><div className="pdf-page-wrap"><p>Page {page+1} · {tool==="highlight"?"drag to highlight":"click to place"}</p><canvas ref={canvas} className="pdf-page" aria-label={`PDF page ${page+1} preview`} onPointerDown={e=>{if(!busy){start.current=point(e)||null;e.currentTarget.setPointerCapture(e.pointerId);}}} onPointerUp={e=>void place(e)} onPointerCancel={()=>{start.current=null;}} /></div></div>
    </>}
    <p className="tool-footnote">Edits add annotations and change page arrangement; existing paragraphs stay intact. Files remain in this browser tab. Save your output before closing it.</p>
  </div>;
}
