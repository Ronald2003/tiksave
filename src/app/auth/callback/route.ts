import { NextResponse } from "next/server";
import { serverSupabase } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/env";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const code = params.get("code");
  const next = params.get("next") === "/auth?mode=update" ? "/auth?mode=update" : "/library";
  if (code) {
    try {
      const db = await serverSupabase();
      const { error } = await db.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(next, siteUrl()));
    } catch { /* Return the same safe error for configuration or expired links. */ }
  }
  return NextResponse.redirect(new URL("/auth?error=invalid_link", siteUrl()));
}
