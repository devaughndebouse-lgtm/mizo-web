import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Gate the simulator behind a cookie set after successful Stripe verification.
  if (!pathname.startsWith("/app")) return NextResponse.next();

  const access = request.cookies.get("mizo_access")?.value;

  if (!access) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("reason", "subscribe");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // After Stripe redirects back, verify the session and then send the user into /app.
  useEffect(() => {
    const success = searchParams.get("success");
    const sessionId =
      searchParams.get("session_id") || searchParams.get("sessionId");

    if (success !== "true" || !sessionId) return;

    let cancelled = false;
    (async () => {
      try {
        setVerifying(true);
        setVerifyError(null);

        const res = await fetch(
          `/api/verify-session?session_id=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" }
        );
        const data = await res.json();

        if (cancelled) return;

        if (!res.ok || !data?.ok || !data?.access) {
          setVerifyError(
            data?.error || "Payment verified, but access was not granted."
          );
          setVerifying(false);
          return;
        }

        // Cookie is now set; go to the simulator.
        router.replace("/app");
      } catch (e: any) {
        if (cancelled) return;
        setVerifyError(e?.message || "Failed to verify payment.");
        setVerifying(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <main style={{ padding: "40px", maxWidth: "900px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "42px", fontWeight: "bold" }}>
        Pass Your Journeyman Exam With Confidence.
      </h1>

      <p style={{ fontSize: "20px", marginTop: "20px" }}>
        NEC-referenced practice. Real exam simulations. Clear step-by-step
        explanations built for working electricians.
      </p>

      {verifying && <p style={{ marginTop: "16px" }}>Verifying payment…</p>}

      {verifyError && <p style={{ marginTop: "16px" }}>{verifyError}</p>}

      <div style={{ marginTop: "40px" }}>
        <a
          href="/app"
          style={{
            background: "#111",
            color: "#fff",
            padding: "14px 24px",
            textDecoration: "none",
            borderRadius: "8px",
            fontSize: "18px",
            display: "inline-block",
          }}
        >
          Start Training — $79/month
        </a>
      </div>

      <section style={{ marginTop: "80px" }}>
        <h2>Why Mizo Works</h2>
        <ul>
          <li>NEC-referenced questions</li>
          <li>Timed exam simulator</li>
          <li>Clear calculation explanations</li>
          <li>Built by a 24-year electrician</li>
        </ul>
      </section>

      <section style={{ marginTop: "60px" }}>
        <h3>Texas First. Nationwide Expansion.</h3>
        <p>
          Mizo launches with Texas Journeyman exam prep and will expand
          state-by-state across the United States.
        </p>
      </section>

      <section style={{ marginTop: "60px" }}>
        <h3>30-Day Confidence Guarantee</h3>
        <p>If you don’t feel more prepared, email us for a refund.</p>
      </section>
    </main>
  );
}