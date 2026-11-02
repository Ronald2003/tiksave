import "server-only";
import { createHmac } from "node:crypto";
import { adminSupabase } from "@/lib/supabase/admin";
import { ApiError } from "./errors";
const local = new Map<string, { count: number; expires: number }>();
export async function rateLimit(request: Request, scope: string, limit = 20, userId?: string) {
  // Only Netlify's overwritten client IP header is trusted in production.
  const identity = userId || (process.env.NETLIFY === "true" ? request.headers.get("x-nf-client-connection-ip") : null) || "local";
  const secret = process.env.RATE_LIMIT_SECRET;
  if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32)) throw new ApiError(503, "configuration_required", "Request protection is not configured. Please try again later.");
  const key = createHmac("sha256", secret || "local-development-only").update(`${scope}:${identity}`).digest("hex");
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { data, error } = await adminSupabase().rpc("consume_rate_limit", { bucket_key: key, max_requests: limit });
    if (error) throw new ApiError(503, "rate_limit_unavailable", "Request protection is temporarily unavailable.");
    if (!data) throw new ApiError(429, "rate_limited", "Too many requests. Wait a minute and try again.");
    return;
  }
  if (process.env.NODE_ENV === "production") throw new ApiError(503, "configuration_required", "Request protection is not configured. Please try again later.");
  // shortcut: memory counters are development-only; production always uses the database.
  const now = Date.now();
  for (const [id, item] of local) if (item.expires < now) local.delete(id);
  const bucket = local.get(key) || { count: 0, expires: now + 60_000 };
  local.set(key, bucket);
  if (++bucket.count > limit) throw new ApiError(429, "rate_limited", "Too many requests. Wait a minute and try again.");
}
