"use client";

import Link from "next/link";
import { Suspense, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authBaseUrl =
    typeof window !== "undefined" && window.location.hostname === "localhost"
      ? window.location.origin
      : "https://www.mizomastery.com";

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) return null;

    return createClient(url, anonKey);
  }, []);

  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (!supabase) throw new Error("Supabase not configured.");

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      router.replace("/app");
    } catch (err: any) {
      setError(err.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function sendMagicLink() {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (!supabase) throw new Error("Supabase not configured.");
      if (!email) throw new Error("Enter your email first.");

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${authBaseUrl}/app`,
        },
      });

      if (error) throw error;

      setMessage("Magic link sent. Check your email.");
    } catch (err: any) {
      setError(err.message ?? "Failed to send magic link");
    } finally {
      setLoading(false);
    }
  }

  async function sendPasswordReset() {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (!supabase) throw new Error("Supabase not configured.");
      if (!email) throw new Error("Enter your email first.");

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${authBaseUrl}/login?email=${encodeURIComponent(email)}`,
      });

      if (error) throw error;

      setMessage("Password setup email sent. Check your inbox and spam folder.");
    } catch (err: any) {
      setError(err.message ?? "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white px-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-3xl font-bold">Mizo Mastery Login</h1>
        <p className="mt-3 text-sm leading-6 text-white/70">
          Use the same email you used at checkout. If you do not have a password yet,
          send a magic link or reset your password to create one.
        </p>

        <form className="mt-6 space-y-4" onSubmit={signIn}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border border-white/20 bg-black/30 px-4 py-3"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border border-white/20 bg-black/30 px-4 py-3"
          />

          {error && <div className="text-red-400 text-sm">{error}</div>}
          {message && <div className="text-green-400 text-sm">{message}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-yellow-400 py-3 font-bold text-black"
          >
            Log In
          </button>
        </form>

        <button
          type="button"
          onClick={sendMagicLink}
          disabled={loading}
          className="mt-4 w-full rounded border border-white/20 py-3 disabled:opacity-60"
        >
          Send Magic Link
        </button>

        <button
          type="button"
          onClick={sendPasswordReset}
          disabled={loading}
          className="mt-3 w-full rounded border border-white/20 py-3 disabled:opacity-60"
        >
          Create / Reset Password
        </button>

        <div className="mt-6 text-sm text-white/70">
          Need access? <Link href="/">Subscribe</Link>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}