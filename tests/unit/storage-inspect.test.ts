import { describe, expect, it } from "vitest";
import { readMp4Prefix } from "@/lib/storage/inspect";
describe("bounded Storage verification", () => {
  it("reads a small partial response", async () => expect(await readMp4Prefix(new Response(new Uint8Array([1,2,3]), { status: 206 }))).toEqual(new Uint8Array([1,2,3])));
  it("refuses a server that ignores the requested Range", async () => { await expect(readMp4Prefix(new Response("not partial", { status: 200 }))).rejects.toMatchObject({ code: "range_unavailable" }); });
  it("refuses an oversized declared response", async () => { await expect(readMp4Prefix(new Response("x", { status: 206, headers: { "Content-Length": "1000000" } }))).rejects.toMatchObject({ code: "range_unavailable" }); });
  it("caps streamed bytes even without Content-Length", async () => { await expect(readMp4Prefix(new Response(new Uint8Array(4097), { status: 206 }))).rejects.toMatchObject({ code: "invalid_file" }); });
  it("rejects compressed responses to avoid expansion beyond the byte limit", async () => { await expect(readMp4Prefix(new Response("encoded", { status: 206, headers: { "Content-Encoding": "gzip" } }))).rejects.toMatchObject({ code: "range_unavailable" }); });
});
