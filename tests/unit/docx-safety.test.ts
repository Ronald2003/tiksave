// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { strToU8, strFromU8, unzipSync, zipSync } from "fflate";
import { safeDocx } from "@/lib/documents";
describe("Word package safety",()=>{
  it("removes external relationships and embedded objects before rendering",async()=>{
    const zip=zipSync({"word/document.xml":strToU8("<document/>"),"word/_rels/document.xml.rels":strToU8('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="bad" TargetMode="External" Target="https://example.test/private"/><Relationship Id="ok" Target="media/picture.png"/></Relationships>'),"word/embeddings/object.bin":strToU8("object")});
    const result=unzipSync(await safeDocx(zip));
    const relationships=strFromU8(result["word/_rels/document.xml.rels"]);
    expect(relationships).not.toContain("example.test");expect(relationships).toContain("picture.png");expect(result["word/embeddings/object.bin"]).toBeUndefined();
  });
});
