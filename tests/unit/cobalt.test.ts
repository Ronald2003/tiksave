import { afterEach, describe, expect, it, vi } from "vitest";
import { cobaltEndpoint, parseCobaltDownload, parseCobaltMedia, resolveCobalt } from "@/lib/video/resolvers/cobalt";
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const base = new URL("http://127.0.0.1:9000/");
const reply = () => ({ status: "tunnel", url: `${base}tunnel?exp=${Date.now()+90000}&sig=test`, filename: "test.mp4" });
describe("Cobalt media boundary", () => {
  it("accepts photo collections only through validated backend tunnels", () => {
    const photo = { type: "photo", url: reply().url };
    expect(parseCobaltMedia({ status: "picker", picker: [photo, photo] }, base).images).toHaveLength(2);
    for (const picker of [[], [{ ...photo, url: "https://evil.test/image.jpg" }], [{ ...photo, type: "gif" }], [{ ...photo, url: `${base}tunnel?exp=1` }]]) {
      expect(() => parseCobaltMedia({ status: "picker", picker }, base)).toThrow();
    }
  });
  it("accepts single Instagram image tunnels and mixed carousels",()=>{
    expect(parseCobaltMedia({...reply(),filename:"instagram_photo.jpg"},base).images?.[0].filename).toBe("instagram_photo.jpg");
    expect(()=>parseCobaltMedia({...reply(),filename:"instagram_photo.jpg",url:"https://evil.test/photo.jpg"},base)).toThrow();
    const result=parseCobaltMedia({status:"picker",picker:[{type:"photo",url:reply().url},{type:"video",url:reply().url,thumb:reply().url}]},base);
    expect(result.images).toHaveLength(1);expect(result.videos).toHaveLength(1);expect(result.videos?.[0].filename).toBe("video-2.mp4");
    expect(()=>parseCobaltMedia({status:"picker",picker:[{type:"video",url:reply().url,thumb:"https://evil.test/photo.jpg"}]},base)).toThrow();
  });
  it("reports Instagram source failures without claiming they were video-format failures",()=>{
    expect(()=>parseCobaltMedia({status:"error",error:{code:"error.api.fetch.empty"}},base,"Instagram")).toThrow("Instagram did not provide");
    expect(()=>parseCobaltMedia({status:"error",error:{code:"error.api.content.post.private"}},base,"Instagram")).toThrow("private");
  });
  it("passes a configured backend key only in the server request header", async () => {
    vi.stubEnv("COBALT_API_URL", base.href); vi.stubEnv("COBALT_API_KEY", "explicit-unit-test-key");
    const fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify(reply())));vi.stubGlobal("fetch",fetch);
    const result=await resolveCobalt("https://www.tiktok.com/@fixture/video/6718335390845095173");
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe("Api-Key explicit-unit-test-key");
    expect(JSON.stringify(result)).not.toContain("explicit-unit-test-key");
  });
  it("accepts a short-lived tunnel on the configured backend", () => expect(parseCobaltDownload(reply(), base).filename).toBe("test.mp4"));
  it("rejects external links, arbitrary paths and missing expiry", () => {
    for (const url of ["https://attacker.test/tunnel", `${base}admin`, `${base}tunnel`]) expect(() => parseCobaltDownload({ ...reply(), url }, base)).toThrow();
  });
  it("rejects expired links, images, and provider errors", () => {
    expect(() => parseCobaltDownload({ ...reply(), url: `${base}tunnel?exp=1` }, base)).toThrow();
    expect(() => parseCobaltDownload({ ...reply(), filename: "photo.jpg" }, base)).toThrow();
    expect(() => parseCobaltDownload({ status: "error" }, base)).toThrow();
  });
  it("disallows insecure or loopback production backends", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => cobaltEndpoint(base.href)).toThrow();
    expect(() => cobaltEndpoint("http://remote.example/")).toThrow();
    expect(cobaltEndpoint("https://downloader.example/").origin).toBe("https://downloader.example");
  });
  it("only sends the canonical link to a fixed endpoint", async () => {
    vi.stubEnv("COBALT_API_URL", base.href);
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(reply()))); vi.stubGlobal("fetch", fetch);
    await resolveCobalt("https://www.tiktok.com/@fixture/video/6718335390845095173");
    expect(fetch.mock.calls[0][0].origin).toBe(base.origin);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ alwaysProxy: true, localProcessing: "disabled" });
  });
  it("caps provider responses", async () => {
    vi.stubEnv("COBALT_API_URL", base.href);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("x".repeat(65537))));
    await expect(resolveCobalt("https://www.tiktok.com/@fixture/video/6718335390845095173")).rejects.toMatchObject({ code: "provider_error" });
  });
  it("retries a transient fetch failure once", async () => {
    vi.stubEnv("COBALT_API_URL", base.href);
    const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({status:"error",error:{code:"error.api.fetch.fail"}}),{status:400})).mockResolvedValueOnce(new Response(JSON.stringify(reply())));
    vi.stubGlobal("fetch", fetch);
    expect((await resolveCobalt("https://www.tiktok.com/@fixture/video/6718335390845095173")).directDownload?.filename).toBe("test.mp4");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
