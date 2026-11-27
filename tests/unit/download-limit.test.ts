import { afterEach, expect, it, vi } from "vitest";
import { rateLimit } from "@/lib/security/rate-limit";

const store = vi.hoisted(() => ({ getWithMetadata: vi.fn(), setJSON: vi.fn() }));
vi.mock("@netlify/blobs", () => ({ getStore: () => store }));
afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });

it("rechecks a concurrent writer before allowing another download", async () => {
  vi.stubEnv("NETLIFY", "true");
  store.getWithMetadata.mockResolvedValueOnce(null).mockResolvedValueOnce({
    etag: "v1", data: { count: 1, expires: Date.now() + 60000 },
  });
  store.setJSON.mockResolvedValue({ modified: false });
  await expect(rateLimit(new Request("https://example.com"), "resolve", 1)).rejects.toMatchObject({ status: 429 });
  expect(store.setJSON).toHaveBeenCalledTimes(1);
  expect(store.setJSON.mock.calls[0][2]).toEqual({ onlyIfNew: true });
});

it("starts a new window when the previous counter expires", async () => {
  vi.stubEnv("NETLIFY", "true");
  store.getWithMetadata.mockResolvedValue({ etag: "v1", data: { count: 20, expires: 1 } });
  store.setJSON.mockResolvedValue({ modified: true });
  await rateLimit(new Request("https://example.com"), "resolve");
  expect(store.setJSON.mock.calls[0].slice(1)).toEqual([{ count: 1, expires: expect.any(Number) }, { onlyIfMatch: "v1" }]);
});
