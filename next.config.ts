import type { NextConfig } from "next";

const csp = [
  "default-src 'self'", "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'" + (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""),
  "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob: https:",
  "font-src 'self' blob: data:", "connect-src 'self' https://*.supabase.co http://127.0.0.1:54321 ws://localhost:*",
  "media-src 'self' blob: https://*.supabase.co", "object-src 'none'", "base-uri 'self'",
  "frame-ancestors 'none'", "form-action 'self'", "frame-src 'self'", "worker-src 'self'",
].join("; ");
const config: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "Content-Security-Policy", value: csp },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
    ] }];
  },
};
export default config;
