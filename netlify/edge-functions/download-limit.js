export const config = {
  path: "/api/videos/resolve",
  rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ["ip", "domain"] },
};

export default async function downloadLimit(request, context) {
  const secret = Netlify.env.get("RATE_LIMIT_SECRET");
  if (!secret || secret.length < 32) return;
  const minute = Math.floor(Date.now() / 60000);
  const bytes = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", bytes.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, bytes.encode("download-limit/" + minute));
  const headers = new Headers(request.headers);
  headers.set("x-tiksave-download-limit", btoa(String.fromCharCode(...new Uint8Array(signature))));
  return context.next(new Request(request, { headers }));
}
