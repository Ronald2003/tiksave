import { copyFile, cp, mkdir, readFile, writeFile } from "node:fs/promises";
await mkdir("public/pdf-assets",{recursive:true});
await copyFile("node_modules/pdfjs-dist/build/pdf.worker.min.mjs","public/pdf.worker.min.mjs");
for(const directory of ["cmaps","standard_fonts","wasm"]) await cp(`node_modules/pdfjs-dist/${directory}`,`public/pdf-assets/${directory}`,{recursive:true});
let notices="TikSave document tools — third-party licenses\n\n";
for(const [name,license] of [["pdf-lib","LICENSE.md"],["pdfjs-dist","LICENSE"],["docx","LICENSE"],["docx-preview","LICENSE"],["html2canvas","LICENSE"],["fflate","LICENSE"]]) notices+=`\n--- ${name} ---\n${await readFile(`node_modules/${name}/${license}`,"utf8")}\n`;
await writeFile("public/document-licenses.txt",notices);
