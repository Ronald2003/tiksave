import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";
import type { RequestOptions } from "node:https";
import type { IncomingMessage } from "node:http";
vi.mock("node:dns/promises", () => ({ resolve4: vi.fn(), resolve6: vi.fn() }));
vi.mock("node:https", () => ({ request: vi.fn() }));
import { resolve4, resolve6 } from "node:dns/promises";
import { request } from "node:https";
import { safeTikTokGet } from "@/lib/security/network";
const dns4 = vi.mocked(resolve4);
const dns6 = vi.mocked(resolve6);
let captured: RequestOptions;
beforeEach(() => {
  vi.resetAllMocks();
  dns4.mockResolvedValue(["8.8.8.8"]);
  dns6.mockRejectedValue(new Error("no IPv6"));
  vi.mocked(request).mockImplementation(((url: URL, options: RequestOptions, respond: (res: IncomingMessage) => void) => {
    captured = options;
    const req = new EventEmitter();
    const res = Object.assign(new EventEmitter(), { statusCode: 200, headers: {}, destroy: vi.fn() });
    return Object.assign(req, { end: () => queueMicrotask(() => { respond(res as unknown as IncomingMessage); res.emit("data", Buffer.from("ok")); res.emit("end"); }) });
  }) as typeof request);
});
describe("SSRF connection boundary", () => {
  it("pins the checked public IP while keeping the TLS hostname", async () => {
    expect((await safeTikTokGet(new URL("https://vm.tiktok.com/ABCdef/"))).body).toBe("ok");
    expect(captured.family).toBe(4);
    const lookup = captured.lookup as (host: string, options: object, done: (error: null, address: string, family: number) => void) => void;
    const done = vi.fn(); lookup("vm.tiktok.com", {}, done);
    expect(done).toHaveBeenCalledWith(null, "8.8.8.8", 4);
    expect(vi.mocked(request).mock.calls[0][0]).toEqual(new URL("https://vm.tiktok.com/ABCdef/"));
  });
  it("rejects mixed public/private DNS answers before connecting", async () => {
    dns4.mockResolvedValue(["8.8.8.8", "127.0.0.1"]);
    await expect(safeTikTokGet(new URL("https://vm.tiktok.com/ABCdef/"))).rejects.toMatchObject({ code: "provider_error" });
    expect(request).not.toHaveBeenCalled();
  });
  it("rejects destinations outside TikTok before DNS resolution", async () => {
    await expect(safeTikTokGet(new URL("https://attacker.test/"))).rejects.toMatchObject({ code: "invalid_url" });
    expect(resolve4).not.toHaveBeenCalled(); expect(request).not.toHaveBeenCalled();
  });
  it("caps accumulated response bytes", async () => {
    await expect(safeTikTokGet(new URL("https://vm.tiktok.com/ABCdef/"), 1)).rejects.toMatchObject({ code: "provider_error" });
  });
});
