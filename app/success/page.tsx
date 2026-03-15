"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type VerifyResponse = {
  ok?: boolean;
  access?: boolean;
  email?: string | null;
  track?: "journeyman" | "master" | null;
  error?: string;
  message?: string;
};

function SuccessInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [status, setStatus] = useState("Verifying your payment...");
  const [detail, setDetail] = useState(
    "Please wait while we confirm your Stripe checkout and finish account setup."
  );
  const [hasError, setHasError] = useState(false);
  const [redirectSeconds, setRedirectSeconds] = useState(0.9);
  const [redirectTarget, setRedirectTarget] = useState("/login");

  useEffect(() => {
    if (!sessionId) {
      setHasError(true);
      setStatus("Missing checkout session");
      setDetail(
        "We could not find the Stripe session ID in the success URL. Please return to the homepage and try checkout again."
      );
      return;
    }

    const verifiedSessionId = sessionId;
    let cancelled = false;

    async function verifyCheckout() {
      try {
        const res = await fetch(
          `/api/verify-session?session_id=${encodeURIComponent(verifiedSessionId)}`,
          { cache: "no-store", credentials: "include" }
        );

        const data: VerifyResponse = await res.json().catch(() => ({}));
        if (!res.ok || !data?.access) {
          throw new Error(data?.error ?? data?.message ?? "Failed to verify checkout");
        }

        if (cancelled) return;
        const email = typeof data.email === "string" ? data.email : null;
        const track = data.track === "master" || data.track === "journeyman"
          ? data.track
          : null;

        setStatus("Access unlocked");
        setDetail(
          track === "master"
            ? "Master access unlocked. Redirecting you to login…"
            : track === "journeyman"
              ? "Journeyman access unlocked. Redirecting you to login…"
              : "Redirecting you to login…"
        );

        const params = new URLSearchParams();

        if (email) {
          params.set("email", email);
        }

        if (track) {
          params.set("track", track);
        }

        const query = params.toString();
        const nextTarget = query ? `/login?${query}` : "/login";
        setRedirectTarget(nextTarget);
        setRedirectSeconds(0.9);

        window.setTimeout(() => {
          router.replace(nextTarget);
        }, 900);
      } catch (err: unknown) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : typeof err === "string" ? err : null;
        setHasError(true);
        setStatus("Could not unlock access");
        setDetail(message ?? "Verification error");
      }
    }

    verifyCheckout();

    return () => {
      cancelled = true;
    };
  }, [sessionId, router]);

  useEffect(() => {
    if (hasError) return;
    if (redirectSeconds <= 0) return;

    const timer = window.setInterval(() => {
      setRedirectSeconds((prev) => {
        const next = Math.max(0, Number((prev - 0.1).toFixed(1)));
        return next;
      });
    }, 100);

    return () => window.clearInterval(timer);
  }, [hasError, redirectSeconds]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.16),_transparent_28%),linear-gradient(180deg,_#0b0b0c_0%,_#111214_55%,_#0a0a0b_100%)] px-6 py-10 text-white">
      <div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur">
        <div className="text-sm font-black uppercase tracking-[0.25em] text-yellow-300">
          Mizo Mastery
        </div>

        <h1 className="mt-4 text-4xl md:text-5xl font-extrabold leading-tight text-yellow-300 animate-pulse">
          {hasError ? "Setup needs attention" : "PASS YOUR JOURNEYMAN OR MASTER EXAM THE FIRST TIME"}
        </h1>

        {!hasError && (
          <div className="mx-auto mt-6 flex h-20 w-20 items-center justify-center rounded-full border border-green-400/30 bg-green-400/10 text-4xl text-green-300 shadow-lg shadow-green-500/10">
            ✓
          </div>
        )}

        <p className="mt-6 text-xl font-semibold text-white">{status}</p>
        <p className="mt-4 text-sm leading-7 text-white/75">{detail}</p>
        <div className="mt-8 rounded-2xl border border-yellow-300/30 bg-yellow-300/10 p-5 text-left">
          <p className="text-sm font-bold text-yellow-200 uppercase tracking-wide">
            Electrician Feedback
          </p>
          <p className="mt-2 text-sm leading-6 text-white/85">
            "Mizo helped me pass my exam on the first try. The questions felt exactly like the real test and the simulator made me fast with the code book." 
          </p>
          <p className="mt-2 text-xs text-white/60">
            — Licensed Electrician
          </p>
        </div>

        {!hasError && (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-white/60">
              <span>Redirecting now</span>
              <span>{redirectSeconds.toFixed(1)}s</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full border border-white/10 bg-white/10">
              <div
                className="h-full rounded-full bg-yellow-300 transition-all duration-100"
                style={{ width: `${Math.max(0, Math.min(100, ((0.9 - redirectSeconds) / 0.9) * 100))}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => router.replace("/")}
            className="rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
          >
            Back to homepage
          </button>

          <button type="button" onClick={() => router.replace("/login")} className="rounded-xl border border-yellow-300/30 bg-yellow-300/10 px-5 py-3 text-sm font-bold text-yellow-200 transition hover:bg-yellow-300/20">
            Go to login
          </button>

          {!hasError && (
            <button
              type="button"
              onClick={() => router.replace(redirectTarget)}
              className="mizo-btn"
            >
              Start practicing now
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessInner />
    </Suspense>
  );
}
