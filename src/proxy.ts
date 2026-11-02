import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicConfig } from "@/lib/env";
export async function proxy(request: NextRequest) {
  const config = publicConfig();
  let response = NextResponse.next({ request });
  if (!config) return response;
  const db = createServerClient(config.url, config.key, { cookies: {
    getAll: () => request.cookies.getAll(),
    setAll: (cookies) => {
      cookies.forEach(({ name, value }) => request.cookies.set(name, value));
      response = NextResponse.next({ request });
      cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, { ...options, sameSite: "lax", secure: process.env.NODE_ENV === "production" }));
    },
  } });
  await db.auth.getUser();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = { matcher: ["/library/:path*", "/auth/:path*", "/api/library", "/api/videos/:path*"] };
