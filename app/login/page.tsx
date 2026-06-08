"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState, type FormEvent, type ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient, type Session } from "@supabase/supabase-js";

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
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    const verifyAccess = async (email: string) => {
      const { data: accessRow, error: accessError } = await supabase
        .from("mizo_users")
        .select("access_active")
        .eq("email", email)
        .maybeSingle();

      if (accessError || !accessRow?.access_active) {
        await supabase.auth.signOut({ scope: "local" });
        setAccessDenied(true);
        setError(
          "Your account does not currently have active access. Please contact support."
        );
        return false;
      }

      return true;
    };

    const finishLogin = async () => {
      const code = searchParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          setError(error.message ?? "Unable to complete login.");
          return;
        }

        const session = await supabase.auth.getSession();
        const userEmail = session.data.session?.user.email;

        if (userEmail && (await verifyAccess(userEmail))) {
          router.replace("/app");
        }
        return;
      }

      const { data } = await supabase.auth.getSession();
      const userEmail = data.session?.user.email;
      if (userEmail && (await verifyAccess(userEmail))) {
        router.replace("/app");
      } else if (!userEmail) {
        setAccessDenied(false);
      }
    };

    void finishLogin();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: string, session: Session | null) => {
      const userEmail = session?.user.email;
      if (event === "SIGNED_IN" && userEmail) {
        void (async () => {
          if (await verifyAccess(userEmail)) {
            router.replace("/app");
          }
        })();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, searchParams, supabase]);

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
          emailRedirectTo: `${authBaseUrl}/login`,
        },
      });

      if (error) throw error;

      setMessage("Magic link sent. Check your email.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err) ?? "Failed to send magic link");
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
          onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              void sendMagicLink();
            }}
        >
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            autoComplete="email"
            required
            className="w-full rounded border border-white/20 bg-black/30 px-4 py-3"
          />

          {accessDenied && (
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              Your account does not currently have active access. If you believe this is an error,
              please contact support.
            </div>
          )}
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