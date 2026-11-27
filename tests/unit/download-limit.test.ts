import { afterEach, expect, it, vi } from "vitest";
import downloadLimit, { config } from "../../netlify/edge-functions/download-limit";
import { rateLimit } from "@/lib/security/rate-limit";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it("recognizes only signed requests from the download rate-limit rule", async () => {
  const secret = "unit-test-only-rate-limiting-secret";
  vi.stubEnv("RATE_LIMIT_SECRET", secret);
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  vi.stubGlobal("Netlify", { env: { get: () => secret } });
  expect(config).toEqual({ path: "/api/videos/resolve", rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ["ip", "domain"] } });
  const request = new Request("https://example.org/api/videos/resolve", { headers: { "x-tiksave-download-limit": "a".repeat(44) } });
  await expect(rateLimit(request, "resolve")).rejects.toMatchObject({ status: 503 });
  await downloadLimit(request, { next: async (forwarded: Request) => {
    await expect(rateLimit(forwarded, "resolve")).resolves.toBeUndefined();
    await expect(rateLimit(forwarded, "upload")).rejects.toMatchObject({ status: 503 });
  } });
});
