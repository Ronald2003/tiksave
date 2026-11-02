import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Library } from "@/components/library/library";
import { SetupNotice } from "@/components/setup-notice";
import { maxUploadBytes, publicConfig } from "@/lib/env";
import { serverSupabase } from "@/lib/supabase/server";
export const metadata: Metadata = { title: "Your creator library", robots: { index: false, follow: false }, alternates: { canonical: "/library" } };
export const dynamic = "force-dynamic";
export default async function LibraryPage() {
  if (!publicConfig()) return <div className="container"><div className="page-intro"><h1>Your original library.</h1><p>A private home for the videos you create.</p></div><SetupNotice /></div>;
  const db = await serverSupabase();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/auth");
  return <Library email={user.email || "Creator"} maxBytes={maxUploadBytes()} />;
}
