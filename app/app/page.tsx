"use client";

import { useState } from "react";
import Link from "next/link";
import { Simulator } from "./simulator";

export default function AppPage() {
  const [topic, setTopic] = useState("mixed");
  const btn = "mizo-btn";
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold text-black">Mizo Mastery</h1>
        <p className="text-sm text-black/80">
          Texas Journeyman training — protected simulator area
        </p>
      </header>

      <section className="rounded-lg border bg-white p-4 shadow-sm text-black">
        <label className="text-sm font-semibold">Topic</label>
        <select
          className="mt-2 rounded border px-3 py-2 text-sm"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        >
          <option value="mixed">Mixed</option>
          <option value="definitions">Definitions / Plans</option>
          <option value="calc_theory">Calculations & Theory</option>
          <option value="services">Services</option>
          <option value="feeders">Feeders</option>
          <option value="branch">Branch Circuits</option>
          <option value="wiring">Wiring Methods</option>
          <option value="equipment">Equipment & Devices</option>
          <option value="motors">Motors</option>
          <option value="controls">Controls / Disconnects</option>
          <option value="special">Special Occupancies</option>
          <option value="renewable">Renewable (PV)</option>
          <option value="dwelling">Dwelling Load</option>
        </select>
      </section>

      <section className="rounded-lg border bg-white p-6 shadow-sm text-black">
        <div className="text-xs uppercase tracking-wide opacity-70">Practice</div>
        <h2 className="mt-2 text-xl font-semibold">Simulator is live</h2>
        <p className="mt-2 text-sm opacity-80">
          Your website is functioning and this page is protected by the paywall.
        </p>
      </section>

      <Simulator />

      <button
        className={btn}
        onClick={async () => {
          const res = await fetch("/api/create-checkout-session", {
            method: "POST",
            credentials: "include",
          });
          const data = await res.json().catch(() => ({}));

          if (!data?.url) {
            alert(`Stripe error: ${data?.error ?? "No checkout URL returned"}`);
            return;
          }

          window.location.href = data.url;
        }}
      >
        Start Training
      </button>

      <Link href="/" className="mizo-btn w-fit">
        Back Home
      </Link>
    </main>
  );
}
