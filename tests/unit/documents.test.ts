import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { arrangePdf, markPdf, mergePdf, openPdf, pageOrder, readDocument, rotatePdf } from "@/lib/documents";
describe("local document tools",()=>{
  it("validates page ranges before rearranging or splitting",async()=>{
    expect(pageOrder("3,1-2",3)).toEqual([2,0,1]);
    for(const order of ["0","4","2-1","1,1","1-a",""])expect(()=>pageOrder(order,3)).toThrow();
    const pdf=await PDFDocument.create();pdf.addPage([300,400]);pdf.addPage([400,500]);pdf.addPage([500,600]);
    const bytes=await pdf.save();
    const reordered=await openPdf(await arrangePdf(bytes,pageOrder("3,1",3)));
    expect(reordered.getPages().map(page=>page.getWidth())).toEqual([500,300]);
    const rotated=await openPdf(await rotatePdf(bytes,1));expect(rotated.getPage(1).getRotation().angle).toBe(90);
  });
  it("adds actual PDF annotation content and rejects invalid files",async()=>{
    const pdf=await PDFDocument.create();pdf.addPage();const bytes=await pdf.save();
    const marked=await markPdf(bytes,0,50,100,{kind:"text",text:"Test annotation",size:16,color:"#123456"});
    expect((await openPdf(marked)).getPage(0).node.Contents()).toBeDefined();
    await expect(markPdf(bytes,0,0,0,{kind:"text",text:"",size:16,color:"#000000"})).rejects.toThrow();
    await expect(openPdf(new TextEncoder().encode("not a PDF"))).rejects.toThrow("valid PDF");
    await expect(readDocument(new File(["bad"],"test.exe"),".pdf")).rejects.toThrow(".pdf");
  });
  it("merges pages and saves highlights without losing page count",async()=>{
    const first=await PDFDocument.create();first.addPage([400,500]);const second=await PDFDocument.create();second.addPage([300,400]);
    const merged=await mergePdf(await first.save(),[new File([Uint8Array.from(await second.save()).buffer],"second.pdf")]);
    const marked=await markPdf(merged,0,50,50,{kind:"highlight",x2:150,y2:75});
    expect((await openPdf(marked)).getPages().map(page=>page.getWidth())).toEqual([400,300]);
  });
});
