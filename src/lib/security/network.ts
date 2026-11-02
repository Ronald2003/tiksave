import "server-only";
import { resolve4, resolve6 } from "node:dns/promises";
import { request } from "node:https";
import ipaddr from "ipaddr.js";
import { ApiError } from "./errors";

export function isPublicAddress(address: string): boolean {
  try {
    const ip = ipaddr.process(address);
    return ip.range() === "unicast" && !(ip.kind() === "ipv6" && ["2001:0:", "2002:"].some((p) => address.toLowerCase().startsWith(p)));
  } catch { return false; }
}
export async function safeTikTokGet(url: URL, maxBytes = 131072) {
  if (url.protocol !== "https:" || !["tiktok.com", "www.tiktok.com", "m.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"].includes(url.hostname) || url.port || url.username || url.password) throw new ApiError(400, "invalid_url", "The redirect is outside supported TikTok domains.");
  const addresses = await Promise.race([
    Promise.allSettled([resolve4(url.hostname), resolve6(url.hostname)]),
    new Promise<never>((_resolve, reject) => { const timer = setTimeout(() => reject(new ApiError(502, "provider_error", "TikTok DNS resolution timed out.")), 5000); timer.unref(); }),
  ]);
  const all = addresses.flatMap((result, index) => result.status === "fulfilled" ? result.value.map((address) => ({ address, family: index === 0 ? 4 : 6 })) : []);
  if (!all.length || all.some(({ address }) => !isPublicAddress(address))) throw new ApiError(502, "provider_error", "TikTok could not be reached safely.");
  const pinned = all[0];
  return new Promise<{ status: number; location?: string; body: string }>((resolve, reject) => {
    const req = request(url, {
      method: "GET", signal: AbortSignal.timeout(6000), family: pinned.family,
      headers: { Accept: "application/json, text/html;q=0.5", "User-Agent": "TikSave/1.0 (metadata and short-link resolution)", "Accept-Encoding": "identity" },
      // Pin the checked address while TLS still verifies the original hostname.
      lookup: (_hostname, _options, callback) => callback(null, pinned.address, pinned.family),
    }, (res) => {
      const status = res.statusCode || 502;
      if (status >= 300 && status < 400) { resolve({ status, location: res.headers.location, body: "" }); res.destroy(); return; }
      if (Number(res.headers["content-length"]) > maxBytes) { res.destroy(); reject(new ApiError(502, "provider_error", "TikTok returned an oversized response.")); return; }
      const chunks: Buffer[] = [];
      let bytes = 0;
      res.on("data", (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > maxBytes) { res.destroy(); reject(new ApiError(502, "provider_error", "TikTok returned an oversized response.")); }
        else chunks.push(chunk);
      });
      res.on("end", () => resolve({ status, body: Buffer.concat(chunks).toString("utf8") }));
      res.on("error", reject);
    });
    req.on("error", () => reject(new ApiError(502, "provider_error", "TikTok did not respond. Please try again.")));
    req.end();
  });
}
