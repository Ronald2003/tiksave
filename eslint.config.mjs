import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default defineConfig([...nextVitals, ...nextTs,
  // Remote thumbnails stay browser-direct; never turn arbitrary TikTok CDN URLs into an image proxy.
  { files: ["src/components/downloader/downloader.tsx"], rules: { "@next/next/no-img-element": "off" } },
  globalIgnores([".local/**", ".next/**", "test-results/**", "playwright-report/**", "next-env.d.ts"])]);
