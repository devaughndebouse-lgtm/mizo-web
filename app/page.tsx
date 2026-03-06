"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function HomeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const success = searchParams.get("success") === "true";
  const canceled = searchParams.get("canceled") === "true";
  const sessionId = searchParams.get("session_id");
  const reason = searchParams.get("reason");

  useEffect(() => {
    if (!success || !sessionId) return;

    let cancelled = false;
    (async () => {
      try {
        setVerifying(true);
        setError(null);

        const res = await fetch(
          `/api/verify-session?session_id=${encodeURIComponent(sessionId)}`,
          { method: "GET", credentials: "include" }
        );

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.access) {
          throw new Error(data?.error ?? "Failed to verify checkout");
        }

        if (cancelled) return;

        const email =
          typeof data?.email === "string" && data.email.trim()
            ? data.email.trim()
            : null;
        const tempPassword =
          typeof data?.tempPassword === "string" && data.tempPassword.trim()
            ? data.tempPassword.trim()
            : null;

        if (email && tempPassword) {
          const qp = new URLSearchParams({
            email,
            temp: tempPassword,
            next: "/app",
          });
          router.replace(`/login?${qp.toString()}`);
          return;
        }

        router.replace("/app");
      } catch (err: unknown) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : typeof err === "string" ? err : null;
        setError(message ?? "Verification failed");
      } finally {
        if (!cancelled) setVerifying(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, sessionId, success]);

  async function startCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? "Checkout failed");
      }

      if (!data?.url || typeof data.url !== "string") {
        throw new Error("No checkout URL returned");
      }

      window.location.href = data.url;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : typeof err === "string" ? err : null;
      setError(message ?? "Checkout failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(70%_50%_at_50%_0%,rgba(255,215,0,0.25)_0%,rgba(255,255,255,0)_60%)]">
      <div className="mx-auto max-w-5xl px-6 py-10 text-black">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="text-lg font-extrabold tracking-tight">
            mizo-web
          </Link>
          <nav className="flex items-center gap-3 text-sm font-semibold">
            <Link className="rounded px-2 py-1 hover:bg-black/5" href="/login">
              Log in
            </Link>
            <button
              className="rounded px-2 py-1 hover:bg-black/5"
              onClick={() => router.push("/app")}
            >
              Simulator
            </button>
          </nav>
        </header>

        <section className="mt-12 grid gap-6">
          <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-6xl">
            Pass your Journeyman exam with confidence.
          </h1>
          <p className="max-w-2xl text-pretty text-base font-medium text-black/70 sm:text-lg">
            Practice like it’s the real test: timed sets, clear explanations, and
            repeatable drills built for working electricians.
          </p>

          {reason === "subscribe" ? (
            <div className="rounded-xl border bg-white p-4 text-sm font-semibold">
              <span className="font-extrabold">Locked:</span> Simulator access is
              Pro-only. Subscribe to unlock.
            </div>
          ) : null}

          {verifying ? (
            <div className="rounded-xl border bg-white p-4 text-sm font-semibold">
              Payment received — unlocking access…
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
              {error}
            </div>
          ) : null}

          {(success || canceled) && !verifying && !error ? (
            <div className="rounded-xl border bg-white p-4 text-sm font-semibold">
              {success ? "Checkout completed. Finishing setup…" : "Checkout canceled."}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              className="mizo-btn disabled:opacity-60"
              onClick={startCheckout}
              disabled={loading || verifying}
            >
              {loading ? "Opening Checkout…" : "Subscribe — $79/month"}
            </button>

            <button
              className="rounded border border-black bg-white px-4 py-3 text-sm font-extrabold text-black disabled:opacity-60"
              onClick={() => router.push("/login?next=/app")}
              disabled={verifying}
            >
              Log in
            </button>

            <button
              className="rounded border border-black bg-white px-4 py-3 text-sm font-extrabold text-black disabled:opacity-60"
              onClick={() => router.push("/app")}
              disabled={verifying}
            >
              Go to simulator
            </button>
          </div>
        </section>

        <section className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "Timed practice",
              body: "Build speed and confidence with real test pacing.",
            },
            {
              title: "Clear explanations",
              body: "Understand the why, not just the answer.",
            },
            {
              title: "Progress tracking",
              body: "See what’s improving and what to drill next.",
            },
          ].map((c) => (
            <div key={c.title} className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="text-sm font-extrabold">{c.title}</div>
              <div className="mt-1 text-sm font-medium text-black/70">{c.body}</div>
            </div>
          ))}
        </section>

        <section className="mt-14 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <h2 className="text-xl font-extrabold">What you get</h2>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm font-medium text-black/70">
                <li>Exam simulator (demo today, full bank next)</li>
                <li>Practice sets and review mode</li>
                <li>Account login + access gate</li>
              </ul>
            </div>
            <div className="min-w-[240px] rounded-xl border bg-black p-5 text-white">
              <div className="text-xs font-bold text-white/70">Pro</div>
              <div className="mt-1 text-3xl font-extrabold">$79</div>
              <div className="text-sm font-semibold text-white/70">per month</div>
              <button
                className="mt-4 w-full rounded bg-yellow-400 px-4 py-3 text-sm font-extrabold text-black disabled:opacity-60"
                onClick={startCheckout}
                disabled={loading || verifying}
              >
                {loading ? "Opening Checkout…" : "Subscribe"}
              </button>
              <div className="mt-3 text-xs font-medium text-white/60">
                Cancel anytime.
              </div>
            </div>
          </div>
        </section>

        <footer className="mt-14 border-t py-8 text-xs font-medium text-black/60">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>© {new Date().getFullYear()} mizo-web</div>
            <div className="flex items-center gap-3">
              <Link className="hover:underline" href="/login">
                Log in
              </Link>
              <button className="hover:underline" onClick={() => router.push("/app")}>
                Simulator
              </button>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}

export default function Home() {
  // IMPORTANT: useSearchParams() requires a Suspense boundary in App Router.
  return (
    <Suspense fallback={null}>
      <HomeInner />
    </Suspense>
  );
}

