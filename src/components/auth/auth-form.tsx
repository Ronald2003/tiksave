"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, LogIn } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { browserSupabase } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { siteUrl } from "@/lib/env";
const schema = z.object({ email: z.email("Enter a valid email address."), password: z.string() });
type Mode = "signin" | "signup" | "reset" | "update";
export function AuthForm({ initialMode = "signin" }: { initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const router = useRouter();
  const { register, handleSubmit, setError: setFieldError, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });
  async function submit(values: z.infer<typeof schema>) {
    setError(""); setNotice("");
    if (mode !== "reset" && (values.password.length < (mode === "signin" ? 1 : 12))) { setFieldError("password", { message: mode === "signin" ? "Enter your password." : "Use a password with at least 12 characters." }, { shouldFocus: true }); return; }
    try {
      const db = browserSupabase();
      if (mode === "reset") {
        const { error } = await db.auth.resetPasswordForEmail(values.email, { redirectTo: `${siteUrl()}/auth/callback?next=/auth?mode=update` });
        if (error) throw error;
        setNotice("If this address has an account, a password reset link is on its way. Check your inbox.");
      } else if (mode === "update") {
        const { error } = await db.auth.updateUser({ password: values.password });
        if (error) throw error;
        setNotice("Your password is updated. You can now open your library.");
        router.push("/library"); router.refresh();
      } else if (mode === "signup") {
        const { error } = await db.auth.signUp({ email: values.email, password: values.password, options: { emailRedirectTo: `${siteUrl()}/auth/callback` } });
        if (error) throw error;
        setNotice("Check your email to confirm your account, then sign in to your library.");
      } else {
        const { error } = await db.auth.signInWithPassword(values);
        if (error) throw error;
        router.push("/library"); router.refresh();
      }
    } catch (error) { setError((error as Error).message); }
  }
  function changeMode(value: Mode) { setMode(value); setError(""); setNotice(""); }
  return <div className="auth-shell"><span className="auth-icon"><LogIn size={23} aria-hidden="true" /></span><h1>{mode === "reset" ? "Forgot your password?" : mode === "update" ? "A fresh start." : "Your originals live here."}</h1><p>{mode === "reset" ? "We’ll send you a link to reset it." : mode === "update" ? "Choose a new password for your account." : "Sign in to upload, manage, and share your original videos."}</p>
    <div className="auth-card">{["signin", "signup"].includes(mode) && <div className="auth-tabs" aria-label="Account action"><button type="button" aria-pressed={mode === "signin"} onClick={() => changeMode("signin")}>Sign in</button><button type="button" aria-pressed={mode === "signup"} onClick={() => changeMode("signup")}>Create account</button></div>}
      <form onSubmit={handleSubmit(submit)} noValidate>
        <div className="form-field"><label htmlFor="email">Email address</label><Input id="email" type="email" autoComplete="email" placeholder="you@example.com" {...register("email")} aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} />{errors.email && <p className="field-error" id="email-error" role="alert">{errors.email.message}</p>}</div>
        {mode !== "reset" && <div className="form-field"><label htmlFor="password">{mode === "update" ? "New password" : "Password"}</label><Input id="password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} {...register("password")} aria-invalid={!!errors.password} aria-describedby={errors.password ? "password-error" : "password-help"} />{errors.password ? <p className="field-error" id="password-error" role="alert">{errors.password.message}</p> : <p className="form-help" id="password-help">{mode === "signin" ? "Use your account password." : "At least 12 characters. A password manager is welcome."}</p>}</div>}
        <Button type="submit" disabled={isSubmitting}>{isSubmitting && <LoaderCircle size={16} className="spin" aria-hidden="true" />}{mode === "signup" ? "Create account" : mode === "reset" ? "Send reset link" : mode === "update" ? "Update password" : "Sign in"}</Button>
      </form>{error && <p className="alert error-alert" role="alert">{error}</p>}{notice && <p className="alert" role="status">{notice}</p>}
      <div className="auth-footer"><button onClick={() => changeMode(mode === "reset" || mode === "update" ? "signin" : "reset")}>{mode === "reset" || mode === "update" ? "Back to sign in" : "Forgot password?"}</button></div>
    </div></div>;
}
