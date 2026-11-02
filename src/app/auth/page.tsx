import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { publicConfig } from "@/lib/env";
import { SetupNotice } from "@/components/setup-notice";
export const metadata: Metadata = { title: "Creator sign in", robots: { index: false, follow: false }, alternates: { canonical: "/auth" } };
export default async function AuthPage({ searchParams }: { searchParams: Promise<{ mode?: string; error?: string }> }) {
  const params = await searchParams;
  if (!publicConfig()) return <div className="container"><div className="page-intro"><h1>A home for your originals.</h1><p>Create a library, keep uploads private, and share on your terms.</p></div><SetupNotice /></div>;
  return <>{params.error && <div className="container"><p className="alert error-alert" role="alert">This email link is invalid or expired. Sign in or request a fresh password reset link.</p></div>}<AuthForm initialMode={params.mode === "update" ? "update" : "signin"} /></>;
}
