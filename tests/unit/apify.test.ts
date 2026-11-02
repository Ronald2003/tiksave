import { afterEach, describe, expect, it, vi } from "vitest";
import { parseApifyDownload, resolveApifyYouTube } from "@/lib/video/resolvers/apify";
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const videoId = "bTsGuYRerK8";
const storeId = "EopnmbB0DnsTpDqph";
const run = { data: { id: "BfVIIHZvQhaTdablf", status: "SUCCEEDED", defaultDatasetId: "MN9EJFWUwB1svBcos", defaultKeyValueStoreId: storeId } };
const item = { status: "success", videoId, title: "Test video", uploader: "Creator", deliveredQuality: "720p", downloadUrl: `https://api.apify.com/v2/key-value-stores/${storeId}/records/${videoId}.mp4?signature=fixture` };
const reply = (value: unknown) => new Response(JSON.stringify(value));
describe("YouTube cloud provider", () => {
  it("returns only the expected signed MP4 without credentials", () => {
    expect(parseApifyDownload([item], videoId, storeId)).toMatchObject({ title: "Test video", directDownload: { filename: `youtube-${videoId}.mp4` } });
    for (const downloadUrl of [item.downloadUrl + "&token=secret", item.downloadUrl.replace(storeId, "UnrelatedStore123"), item.downloadUrl.replace("api.apify.com", "evil.test"), item.downloadUrl.replace(".mp4", ".mp3"), item.downloadUrl.split("?")[0]]) {
      expect(() => parseApifyDownload([{ ...item, downloadUrl }], videoId, storeId)).toThrow();
    }
    expect(() => parseApifyDownload([{ ...item, videoId: "jNQXAC9IVRw" }], videoId, storeId)).toThrow();
    expect(() => parseApifyDownload([{ status: "failed", error: "private" }], videoId, storeId)).toThrow("could not be downloaded");
  });
  it.each([`https://youtu.be/${videoId}/`, `https://www.youtube.com/shorts/${videoId}`, `https://www.youtube.com/watch?v=${videoId}`])("caps spending and normalizes %s", async (url) => {
    vi.stubEnv("APIFY_API_TOKEN", "explicit-test-token");
    const fetch = vi.fn().mockResolvedValueOnce(reply(run)).mockResolvedValueOnce(reply([item])); vi.stubGlobal("fetch", fetch);
    const result = await resolveApifyYouTube(url);
    const [endpoint, options] = fetch.mock.calls[0];
    expect(endpoint).toContain("maxTotalChargeUsd=0.10");
    expect(endpoint).toContain("timeout=300");
    expect(endpoint).toContain("forcePermissionLevel=LIMITED_PERMISSIONS");
    expect(options.headers.Authorization).toBe("Bearer explicit-test-token");
    expect(JSON.parse(options.body)).toEqual({ urls: [{ url: `https://www.youtube.com/watch?v=${videoId}` }], quality: "720", format: "default", residentialProxyMode: "disabled" });
    expect(JSON.stringify(result)).not.toContain("explicit-test-token");
  });
  it("aborts an unfinished run rather than creating another", async () => {
    vi.stubEnv("APIFY_API_TOKEN", "explicit-test-token");
    const fetch = vi.fn().mockResolvedValueOnce(reply({ data: { ...run.data, status: "RUNNING" } })).mockResolvedValueOnce(reply({})); vi.stubGlobal("fetch", fetch);
    await expect(resolveApifyYouTube(`https://youtu.be/${videoId}`)).rejects.toThrow("took too long");
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1][0]).toContain(`/actor-runs/${run.data.id}/abort`);
  });
  it("does not retry quota or transport failures and hides provider details", async () => {
    vi.stubEnv("APIFY_API_TOKEN", "explicit-test-token");
    const fetch = vi.fn().mockResolvedValue(new Response("private account detail", { status: 402 })); vi.stubGlobal("fetch", fetch);
    await expect(resolveApifyYouTube(`https://youtu.be/${videoId}`)).rejects.toThrow("shared free allowance");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("bounds response size and validates run identifiers before fetching data", async () => {
    vi.stubEnv("APIFY_API_TOKEN", "explicit-test-token");
    for (const response of [new Response("x".repeat(65537)), reply({ data: { ...run.data, defaultDatasetId: "../../users/me" } })]) {
      const fetch = vi.fn().mockResolvedValue(response); vi.stubGlobal("fetch", fetch);
      await expect(resolveApifyYouTube(`https://youtu.be/${videoId}`)).rejects.toMatchObject({ code: "provider_error" });
      expect(fetch).toHaveBeenCalledTimes(1);
    }
  });
  it("does not send unsupported links to the provider", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    await expect(resolveApifyYouTube("https://www.facebook.com/watch/?v=123")).rejects.toThrow("YouTube");
    expect(fetch).not.toHaveBeenCalled();
  });
});
