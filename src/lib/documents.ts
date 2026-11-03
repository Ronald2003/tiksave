import { PDFDocument, degrees, rgb, StandardFonts } from "pdf-lib";

export const fileLimit = 20 * 1024 * 1024;
export const pageLimit = 60;
export async function readDocument(file: File, extension: string) {
  if (!file.name.toLowerCase().endsWith(extension) || !file.size || file.size > fileLimit) throw new Error(`Choose a ${extension} file up to 20 MB.`);
  return new Uint8Array(await file.arrayBuffer());
}
export async function openPdf(bytes: Uint8Array) {
  if (!new TextDecoder().decode(bytes.subarray(0,1024)).includes("%PDF-")) throw new Error("This is not a valid PDF file.");
  const pdf = await PDFDocument.load(bytes);
  if (!pdf.getPageCount() || pdf.getPageCount() > pageLimit) throw new Error("Use a PDF with 1–60 pages.");
  if (pdf.getPages().some(p => p.getWidth()>2000 || p.getHeight()>2000)) throw new Error("This PDF has oversized pages. Use standard document page sizes.");
  return pdf;
}
export async function pdfViewer(bytes: Uint8Array) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  return pdfjs.getDocument({ data: bytes.slice(), useSystemFonts: true, cMapUrl:"/pdf-assets/cmaps/", cMapPacked:true, standardFontDataUrl:"/pdf-assets/standard_fonts/", wasmUrl:"/pdf-assets/wasm/" }).promise;
}
export function saveFile(bytes: Uint8Array, name: string, mime = "application/pdf") {
  const url = URL.createObjectURL(new Blob([Uint8Array.from(bytes).buffer], { type: mime }));
  const a = document.createElement("a"); a.href=url; a.download=name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export function pageOrder(value: string, count: number) {
  const result: number[] = [];
  for (const part of value.split(",")) {
    const match = /^(\d+)(?:-(\d+))?$/.exec(part.trim());
    if (!match) throw new Error("Use page numbers or ranges, for example 3,1,2 or 1-3,5.");
    const first=Number(match[1]), last=Number(match[2] || match[1]);
    if (first<1 || last<first || last>count) throw new Error(`Choose pages between 1 and ${count}.`);
    for(let i=first;i<=last;i++) { if(result.includes(i-1)) throw new Error("Include each page only once."); result.push(i-1); }
  }
  return result;
}
export async function arrangePdf(bytes: Uint8Array, indices: number[]) {
  const source=await openPdf(bytes), output=await PDFDocument.create();
  if (!indices.length || indices.some(i=>!Number.isInteger(i)||i<0||i>=source.getPageCount())) throw new Error("Choose valid pages.");
  for(const page of await output.copyPages(source, indices)) output.addPage(page);
  return output.save();
}
export async function rotatePdf(bytes: Uint8Array, index: number) {
  const pdf=await openPdf(bytes), page=pdf.getPage(index);
  page.setRotation(degrees((page.getRotation().angle+90)%360)); return pdf.save();
}
export async function mergePdf(bytes: Uint8Array, files: File[]) {
  const pdf=await openPdf(bytes);
  let total=bytes.length;
  for(const file of files) {
    total+=file.size; if(total>fileLimit) throw new Error("Merged inputs must total 20 MB or less.");
    const next=await openPdf(await readDocument(file,".pdf"));
    if(pdf.getPageCount()+next.getPageCount()>pageLimit) throw new Error("Merged PDF must have 60 pages or fewer.");
    for(const page of await pdf.copyPages(next,next.getPageIndices())) pdf.addPage(page);
  }
  return pdf.save();
}
export type PdfMark = { kind: "text"; text: string; size: number; color: string } | { kind: "highlight"; x2: number; y2: number } | { kind: "image"; data: Uint8Array };
export async function markPdf(bytes: Uint8Array, index: number, x: number, y: number, mark: PdfMark) {
  const pdf=await openPdf(bytes), page=pdf.getPage(index);
  if(mark.kind==="text") {
    if(!mark.text.trim() || mark.text.length>500 || !Number.isFinite(mark.size) || mark.size<6 || mark.size>72 || !/^#[a-f\d]{6}$/i.test(mark.color)) throw new Error("Enter up to 500 characters, size 6–72, and a valid color.");
    const c=[1,3,5].map(i=>parseInt(mark.color.slice(i,i+2),16)/255);
    page.drawText(mark.text,{x,y,size:mark.size,font:await pdf.embedFont(StandardFonts.Helvetica),color:rgb(c[0],c[1],c[2]),rotate:degrees(page.getRotation().angle)});
  } else if(mark.kind==="highlight") {
    page.drawRectangle({x:Math.min(x,mark.x2),y:Math.min(y,mark.y2),width:Math.abs(x-mark.x2),height:Math.abs(y-mark.y2),color:rgb(1,.85,0),opacity:.32});
  } else {
    const png=mark.data[0]===137;
    const image=await (png?pdf.embedPng(mark.data):pdf.embedJpg(mark.data));
    const scale=Math.min(160/image.width,120/image.height,page.getWidth()/2/image.width),width=image.width*scale,height=image.height*scale;
    const angle=page.getRotation().angle, radians=angle*Math.PI/180;
    page.drawImage(image,{x:x+Math.sin(radians)*height,y:y-Math.cos(radians)*height,width,height,rotate:degrees(angle)});
  }
  return pdf.save();
}
export async function pdfToWord(bytes: Uint8Array, progress: (text: string)=>void) {
  await openPdf(bytes);
  const viewer=await pdfViewer(bytes);
  try {
    const { Document, Packer, Paragraph, TextRun }=await import("docx");
    const sections=[]; let textPages=0, emptyPages=0;
    for(let i=1;i<=viewer.numPages;i++) {
      progress(`Reading page ${i} of ${viewer.numPages}…`);
      const page=await viewer.getPage(i), content=await page.getTextContent();
      let text="";
      for(const item of content.items) if("str" in item) text+=item.str+(item.hasEOL?"\n":" ");
      if(text.trim()) textPages++; else { emptyPages++; text="[This page contains no extractable text. OCR is needed.]"; }
      sections.push({ children: text.split("\n").map(line=>new Paragraph({children:[new TextRun(line)]})) });
    }
    if(!textPages) throw new Error("This PDF has no extractable text. Scanned PDFs need OCR; this converter does not perform OCR.");
    const blob=await Packer.toBlob(new Document({sections}));
    return { bytes:new Uint8Array(await blob.arrayBuffer()), emptyPages };
  } finally { await viewer.loadingTask.destroy(); }
}

export async function safeDocx(bytes: Uint8Array) {
  const { unzipSync, zipSync, strFromU8, strToU8 }=await import("fflate");
  let total=0, count=0;
  const files=unzipSync(bytes,{filter:entry=>{
    total+=entry.originalSize; count++;
    if(total>60*1024*1024||count>2000||entry.originalSize>20*1024*1024) throw new Error("This Word file is too large when expanded.");
    return true;
  }});
  if(!files["word/document.xml"]) throw new Error("Choose a valid .docx file. Legacy .doc files are not supported.");
  for(const name of Object.keys(files)) {
    if(name.endsWith(".rels")) {
      const xml=new DOMParser().parseFromString(strFromU8(files[name]),"application/xml");
      if(xml.querySelector("parsererror")) throw new Error("This Word file has invalid relationships.");
      for(const relation of Array.from(xml.getElementsByTagNameNS("*","Relationship"))) {
        const target=relation.getAttribute("Target") || "";
        if(relation.getAttribute("TargetMode")==="External" || /^(?:[a-z][\w+.-]*:|\/\/)/i.test(target)) relation.remove();
      }
      files[name]=strToU8(new XMLSerializer().serializeToString(xml));
    }
    if(/(?:embeddings|altChunk|vbaProject)/i.test(name)) delete files[name];
  }
  return zipSync(files);
}

export async function wordToPdf(bytes: Uint8Array, host: HTMLElement, progress: (text:string)=>void) {
  const cleaned=await safeDocx(bytes);
  const frame=document.createElement("iframe");
  frame.title="Local document conversion"; frame.setAttribute("sandbox","allow-same-origin");
  frame.style.cssText="width:1000px;height:1200px;border:0";
  try {
    const loaded=new Promise<void>(resolve=>frame.onload=()=>resolve());
    frame.srcdoc='<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data: blob:; style-src \'unsafe-inline\'; font-src data: blob:; connect-src \'none\'; script-src \'none\'"></head><body style="margin:0;background:white;color:black"></body></html>';
    host.replaceChildren(frame); await loaded;
    const body=frame.contentDocument!.body;
    const { renderAsync }=await import("docx-preview");
    progress("Laying out your Word document…");
    await renderAsync(cleaned,body,undefined,{inWrapper:false,renderAltChunks:false,ignoreLastRenderedPageBreak:false,useBase64URL:true});
    await frame.contentDocument!.fonts.ready;
    await Promise.all(Array.from(body.querySelectorAll("img")).map(img=>img.decode().catch(()=>{})));
    const sections=Array.from(body.querySelectorAll<HTMLElement>("section.docx"));
    if(!sections.length || sections.length>pageLimit) throw new Error("Use a Word document with 1–60 pages.");
    const { default:html2canvas }=await import("html2canvas");
    const pdf=await PDFDocument.create();
    for(const [index,section] of sections.entries()) {
      progress(`Rendering section ${index+1} of ${sections.length}…`);
      if(section.scrollHeight>16000 || section.offsetWidth>2000) throw new Error("This document section is too large. Add page breaks in Word and try again.");
      const canvas=await html2canvas(section,{scale:1.3,backgroundColor:"#ffffff",logging:false,windowWidth:1000,scrollX:0,scrollY:0});
      const width=section.offsetWidth, pageHeight=parseFloat(frame.contentWindow!.getComputedStyle(section).minHeight)||1122;
      const sliceHeight=Math.round(pageHeight*canvas.width/width);
      for(let top=0;top<canvas.height;top+=sliceHeight) {
        if(pdf.getPageCount()>=pageLimit) throw new Error("Output exceeds 60 pages.");
        const slice=document.createElement("canvas"); slice.width=canvas.width; slice.height=Math.min(sliceHeight,canvas.height-top);
        slice.getContext("2d")!.drawImage(canvas,0,top,canvas.width,slice.height,0,0,canvas.width,slice.height);
        const image=await pdf.embedJpg(slice.toDataURL("image/jpeg",.92));
        const page=pdf.addPage([width*.75,pageHeight*.75]);
        const height=image.height/image.width*page.getWidth();
        page.drawImage(image,{x:0,y:page.getHeight()-height,width:page.getWidth(),height});
        slice.width=0; slice.height=0;
      }
      canvas.width=0; canvas.height=0;
    }
    return { bytes:await pdf.save(), pages:pdf.getPageCount() };
  } finally { host.replaceChildren(); }
}
