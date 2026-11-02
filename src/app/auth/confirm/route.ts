import { NextResponse } from "next/server";
import { serverSupabase } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/env";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const hash = params.get("token_hash");
  const type = params.get("type");
  if (hash && (type === "email" || type === "signup" || type === "recovery")) {
    try {
      const db = await serverSupabase();
      const { error } = await db.auth.verifyOtp({ token_hash: hash, type });
      if (!error) return NextResponse.redirect(new URL(type === "recovery" ? "/auth?mode=update" : "/library", siteUrl()));
    } catch { /* Do not reveal token details. */ }
  }
  return NextResponse.redirect(new URL("/auth?error=invalid_link", siteUrl()));
}
