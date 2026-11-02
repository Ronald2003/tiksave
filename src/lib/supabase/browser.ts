"use client";
import { createBrowserClient } from "@supabase/ssr";
import { publicConfig } from "@/lib/env";
export function browserSupabase() {
  const config = publicConfig();
  if (!config) throw new Error("Creator accounts need Supabase configuration. See the setup guide in README.md.");
  return createBrowserClient(config.url, config.key);
}
