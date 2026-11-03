import { test, expect } from "@playwright/test";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { readFile } from "node:fs/promises";
import { strFromU8, unzipSync } from "fflate";
async function samplePdf(){const pdf=await PDFDocument.create();const font=await pdf.embedFont(StandardFonts.Helvetica);for(let i=1;i<=2;i++)pdf.addPage([400,500]).drawText(`Sample page ${i} editable text`,{x:40,y:400,size:16,font});return Buffer.from(await pdf.save());}
test("tools navigation and install instructions",async({page,request,context},testInfo)=>{
  await page.goto("/tools");await expect(page.getByRole("heading",{level:1})).toContainText("Your documents");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const manifest=await (await request.get("/manifest.webmanifest")).json();expect(manifest.start_url).toBe("/");expect(manifest.display).toBe("standalone");
  for(const icon of manifest.icons)expect((await request.get(icon.src)).status()).toBe(200);
  await page.getByRole("button",{name:"Install app",exact:true}).click();await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.screenshot({path:`test-results/tools-${testInfo.project.name}.png`,fullPage:true});
  await page.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));
  await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  const cached=await page.evaluate(async()=>{const entries=[];for(const key of await caches.keys())for(const request of await (await caches.open(key)).keys())entries.push(new URL(request.url).pathname);return entries;});
  expect(cached).toEqual(["/offline.html"]);
  await context.setOffline(true);await page.goto("/tools?offline-test=1");await expect(page.getByRole("heading",{level:1})).toHaveText("You’re offline.");await context.setOffline(false);
});
test("PDF to Word exports editable text",async({page})=>{
  await page.goto("/tools/pdf-to-word");await page.locator('input[type="file"]').setInputFiles({name:"sample.pdf",mimeType:"application/pdf",buffer:await samplePdf()});
  const download=page.waitForEvent("download");await page.getByRole("button",{name:"Convert to Word"}).click();
  const file=await download;expect(file.suggestedFilename()).toBe("sample.docx");
  const zip=unzipSync(new Uint8Array(await readFile((await file.path())!)));expect(strFromU8(zip["word/document.xml"])).toContain("Sample page 1 editable text");
});
test("Word to PDF creates readable rendered pages",async({page})=>{
  test.setTimeout(90000);
  const docx=await Packer.toBuffer(new Document({sections:[{children:[new Paragraph({children:[new TextRun({text:"A document to share",bold:true,size:36})]}),new Paragraph("Local Word conversion works.")]}]}));
  await page.goto("/tools/word-to-pdf");await page.locator('input[type="file"]').setInputFiles({name:"sample.docx",mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",buffer:docx});
  const download=page.waitForEvent("download",{timeout:60000});await page.getByRole("button",{name:"Convert to PDF"}).click();
  const file=await download;expect(file.suggestedFilename()).toBe("sample.pdf");const output=await readFile((await file.path())!);const pdf=await PDFDocument.load(output);expect(pdf.getPageCount()).toBeGreaterThan(0);
  await page.goto("/tools/pdf-editor");await page.getByLabel("Open PDF",{exact:false}).setInputFiles({name:"converted.pdf",mimeType:"application/pdf",buffer:output});
  await expect(page.getByRole("button",{name:"Place at position"})).toBeEnabled();
  const darkPixels=await page.getByLabel("PDF page 1 preview").evaluate((node:HTMLCanvasElement)=>{const data=node.getContext("2d")!.getImageData(0,0,node.width,node.height).data;let count=0;for(let i=0;i<data.length;i+=4)if(data[i]<120&&data[i+1]<120&&data[i+2]<120)count++;return count;});
  expect(darkPixels).toBeGreaterThan(100);
});
test("PDF editor adds text, rotates and saves selected pages",async({page})=>{
  await page.goto("/tools/pdf-editor");await page.getByLabel("Open PDF",{exact:false}).setInputFiles({name:"sample.pdf",mimeType:"application/pdf",buffer:await samplePdf()});
  await expect(page.getByRole("combobox",{name:"Page",exact:true})).toHaveValue("0");
  await expect(page.getByLabel("PDF page 1 preview")).toBeVisible();
  await page.getByRole("textbox",{name:"Text",exact:true}).fill("Added note");
  await page.getByRole("button",{name:"Place at position"}).click();await expect(page.getByRole("status")).toContainText("Change applied");
  await page.getByRole("combobox",{name:"Tool",exact:true}).selectOption("image");
  const pad=page.getByLabel("Draw signature");await pad.scrollIntoViewIfNeeded();const box=await pad.boundingBox();
  if(!box)throw new Error("Missing signature pad");
  await page.mouse.move(box.x+20,box.y+30);await page.mouse.down();await page.mouse.move(box.x+80,box.y+40,{steps:8});await page.mouse.up();
  await page.getByRole("button",{name:"Use signature"}).click();await expect(page.getByRole("status")).toContainText("Signature ready");
  await page.getByRole("button",{name:"Place at position"}).click();await expect(page.getByRole("status")).toContainText("Change applied");
  await page.getByRole("button",{name:"Rotate 90°"}).click();await expect(page.getByRole("status")).toContainText("rotated");
  await page.getByRole("textbox",{name:"Pages",exact:true}).fill("1");const download=page.waitForEvent("download");await page.getByRole("button",{name:"Save selected"}).click();const file=await download;
  const pdf=await PDFDocument.load(await readFile((await file.path())!));expect(pdf.getPageCount()).toBe(1);expect(pdf.getPage(0).getRotation().angle).toBe(90);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:"test-results/pdf-editor.png",fullPage:true});
  const edited=await readFile((await file.path())!);await page.goto("/tools/pdf-to-word");await page.locator('input[type="file"]').setInputFiles({name:"edited.pdf",mimeType:"application/pdf",buffer:edited});
  const wordDownload=page.waitForEvent("download");await page.getByRole("button",{name:"Convert to Word"}).click();const wordFile=await wordDownload;
  const zip=unzipSync(new Uint8Array(await readFile((await wordFile.path())!)));expect(strFromU8(zip["word/document.xml"])).toContain("Added note");
});
