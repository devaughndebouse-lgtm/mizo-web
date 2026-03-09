"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const authBaseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.mizomastery.com").replace(/\/$/, "");

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) return null;

    return createClient(url, anonKey);
  }, []);

  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/app");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        router.replace("/app");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase]);

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

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white px-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-3xl font-bold">Mizo Mastery Login</h1>

        <p className="mt-3 text-sm leading-6 text-white/70">
          Enter the email you used at checkout and we will send you a secure sign‑in link.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void sendMagicLink();
          }}
        >
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            className="w-full rounded border border-white/20 bg-black/30 px-4 py-3"
          />

          {error && <div className="text-red-400 text-sm">{error}</div>}
          {message && <div className="text-green-400 text-sm">{message}</div>}

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full rounded bg-yellow-400 py-3 font-bold text-black disabled:opacity-60"
          >
            {loading ? "Sending link..." : "Email Me a Magic Link"}
          </button>
        </form>

        <div className="mt-6 space-y-2 text-sm text-white/70">
          <div>
            Need access? <Link href="/">Subscribe</Link>
          </div>
          <div>
            Already paid? Enter your email and we will send you a secure sign‑in link.
          </div>
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