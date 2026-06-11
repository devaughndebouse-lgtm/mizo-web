"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type LoginTrack = "journeyman" | "master";

type LoginClientProps = {
  track?: LoginTrack;
};

function getSafeNextPath(value: string | null, track: LoginTrack) {
  const fallback = track === "master" ? "/app?track=master" : "/app";

  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}

function LoginInner({ track = "journeyman" }: LoginClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMaster = track === "master";

  const authBaseUrl =
    typeof window !== "undefined"
      ? window.location.origin.replace(/\/$/, "")
      : (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.mizomastery.com").replace(/\/$/, "");

  const nextPath = getSafeNextPath(searchParams.get("next"), track);

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

    const unlockSimulatorAccess = async (accessToken: string) => {
      const res = await fetch("/api/login-access", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          access_token: accessToken,
          requested_track: track,
        }),
      });

      const data: { error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? `No active ${isMaster ? "master" : "journeyman"} simulator access found.`);
      }
    };

    const finishAuthenticatedLogin = async (accessToken: string) => {
      await unlockSimulatorAccess(accessToken);
      router.replace(nextPath);
    };

    const finishLogin = async () => {
      const code = searchParams.get("code");

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          setError(error.message ?? "Unable to complete login.");
          return;
        }

        const accessToken = data.session?.access_token;
        if (!accessToken) {
          setError("Unable to complete login. Please request a new magic link.");
          return;
        }

        try {
          await finishAuthenticatedLogin(accessToken);
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : "Unable to unlock simulator access.");
        }
        return;
      }

      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (accessToken) {
        try {
          await finishAuthenticatedLogin(accessToken);
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : "Unable to unlock simulator access.");
        }
      }
    };

    void finishLogin();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        void finishAuthenticatedLogin(session.access_token).catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "Unable to unlock simulator access.");
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, searchParams, supabase, nextPath, track, isMaster]);

  async function sendMagicLink() {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (!supabase) throw new Error("Supabase not configured.");
      if (!email) throw new Error("Enter your email first.");

      const redirectPath = isMaster ? "/master-login" : "/login";
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${authBaseUrl}${redirectPath}?next=${encodeURIComponent(nextPath)}`,
        },
      });

      if (error) throw error;

      setMessage("Magic link sent. Check your email.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send magic link");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white px-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-3xl font-bold">
          {isMaster ? "Master Simulator Login" : "Mizo Mastery Login"}
        </h1>

        <p className="mt-3 text-sm leading-6 text-white/70">
          Enter the email you used at checkout and we will send you a secure sign-in link.
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
            {isMaster
              ? "Use the email tied to your Master simulator subscription."
              : "Already paid? Enter your email and we will send you a secure sign-in link."}
          </div>
          <div>
            {isMaster ? (
              <Link href="/login" className="font-semibold text-yellow-300">
                Journeyman login
              </Link>
            ) : (
              <Link href="/master-login" className="font-semibold text-yellow-300">
                Master simulator login
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export function LoginClient(props: LoginClientProps) {
  return (
    <Suspense fallback={null}>
      <LoginInner {...props} />
    </Suspense>
  );
}
