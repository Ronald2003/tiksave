import { z } from "zod";

export function publicConfig() {
  const result = z.object({ url: z.url(), key: z.string().min(1) }).safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  return result.success ? result.data : null;
}
export function siteUrl() {
  const value = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return z.url().parse(value).replace(/\/$/, "");
}
export function maxUploadBytes() {
  return z.coerce.number().int().min(1024).max(26_214_400).default(26_214_400).parse(process.env.MAX_UPLOAD_BYTES);
}
