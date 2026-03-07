"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      return null;
    }

    return createClient(url, anonKey);
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signInWithPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (!supabase) {
        throw new Error("Missing Supabase environment variables.");
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      setMessage("Login successful. Opening your training area...");
      router.replace("/app");
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  async function sendMagicLink() {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (!supabase) {
        throw new Error("Missing Supabase environment variables.");
      }

      if (!email) {
        throw new Error("Enter your email first.");
      }

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/app`,
        },
      });

      if (otpError) throw otpError;

      setMessage("Magic link sent. Check your email inbox and spam folder, then use the link to open your training area.");
    } catch (err: any) {
      setError(err?.message ?? "Could not send magic link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.16),_transparent_28%),linear-gradient(180deg,_#0b0b0c_0%,_#111214_55%,_#0a0a0b_100%)] px-6 py-10 text-white">
      <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
        <div className="text-sm font-black uppercase tracking-[0.25em] text-yellow-300">
          Mizo Mastery
        </div>
        <h1 className="mt-4 text-3xl font-extrabold">Subscriber Login</h1>
        <p className="mt-3 text-sm leading-7 text-white/75">
          Log in to access your paid training simulator. Use your email and password,
          or request a magic link if you prefer a faster sign-in.
        </p>

        <div className="mt-6 rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-3 text-sm text-yellow-100">
          After purchase, Mizo will email your account access link. If password login does not work yet, use the magic link sent to your email.
        </div>

        <form className="mt-8 space-y-4" onSubmit={signInWithPassword}>
          <div>
            <label className="block text-sm font-bold text-white">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/25 px-4 py-3 text-white outline-none placeholder:text-white/35"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-white">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/25 px-4 py-3 text-white outline-none placeholder:text-white/35"
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          {message ? (
            <div className="rounded-xl border border-green-400/30 bg-green-400/10 px-4 py-3 text-sm text-green-200">
              {message}
            </div>
          ) : null}

          {!error && !message ? (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
              If password login fails, the most common cause is that the user has not been created in Supabase Auth yet.
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mizo-btn w-full disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Log In"}
          </button>
        </form>

        <button
          type="button"
          onClick={sendMagicLink}
          disabled={loading}
          className="mt-4 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10 disabled:opacity-60"
        >
          Send Magic Link
        </button>

        <div className="mt-6 text-sm text-white/65">
          Need access first? <Link href="/" className="font-bold text-yellow-300 hover:underline">Start your subscription</Link>
        </div>
      </div>
    </main>
  );
}