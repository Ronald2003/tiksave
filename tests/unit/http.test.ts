import { describe, expect, it } from "vitest";
import { z } from "zod";
import { api, checkOrigin, readJson } from "@/lib/security/http";
describe("API request boundaries", () => {
  it("rejects cross-origin cookie mutations", () => { expect(() => checkOrigin(new Request("http://localhost:3000/api/test", { headers: { origin: "https://evil.test" } }))).toThrow(); expect(() => checkOrigin(new Request("http://localhost:3000/api/test"))).toThrow(); });
  it("accepts the configured origin", () => expect(() => checkOrigin(new Request("http://localhost:3000/api/test", { headers: { origin: "http://localhost:3000" } }))).not.toThrow());
  it("validates JSON and caps body size", async () => { await expect(readJson(new Request("http://localhost/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "x".repeat(9000) }) }), z.object({ text: z.string() }))).rejects.toMatchObject({ status: 413 }); });
  it("does not disclose internal exception details", async () => { const res = await api(async () => { throw new Error("secret-database-key"); }); expect(res.status).toBe(503); expect(JSON.stringify(await res.json())).not.toContain("secret-database-key"); });
});
