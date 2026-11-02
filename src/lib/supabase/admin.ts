import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicConfig } from "@/lib/env";
import { ApiError } from "@/lib/security/errors";
export function adminSupabase() {
  const config = publicConfig();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!config || !key) throw new ApiError(503, "configuration_required", "Video storage is not configured yet. Please try again later.");
  return createClient(config.url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
