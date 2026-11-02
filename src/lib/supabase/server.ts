import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicConfig } from "@/lib/env";
import { ApiError } from "@/lib/security/errors";
export async function serverSupabase() {
  const config = publicConfig();
  if (!config) throw new ApiError(503, "configuration_required", "Creator services are not configured yet. Please try again later.");
  const jar = await cookies();
  return createServerClient(config.url, config.key, { cookies: {
    getAll: () => jar.getAll(),
    setAll: (values) => {
      try { values.forEach(({ name, value, options }) => jar.set(name, value, { ...options, sameSite: "lax", secure: process.env.NODE_ENV === "production" })); }
      catch { /* Server Components rely on the session-refresh proxy for cookie writes. */ }
    },
  } });
}
export async function requireUser() {
  const db = await serverSupabase();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) throw new ApiError(401, "authorization_required", "Sign in to access your creator library.");
  return { db, user };
}
