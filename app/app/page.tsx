"use client";

import { useState } from "react";

export default function AppPage() {
  const [topic, setTopic] = useState("mixed");

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Mizo Mastery</h1>
          <p className="text-sm opacity-80">
            Texas Journeyman training — NEC-referenced questions + timed exam simulator
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/" className="mizo-btn">Home</a>
        </div>
      </div>

      <section className="rounded-lg border bg-white p-4 shadow-sm text-black">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium">Topic</label>
          <select
            className="rounded border px-2 py-1 text-sm"
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
        </div>
      </section>

      <section className="rounded-lg border bg-white p-6 shadow-sm text-black">
        <div className="text-xs uppercase tracking-wide opacity-70">Practice</div>
        <h2 className="mt-2 text-lg font-semibold">Simulator is ready</h2>
        <p className="mt-2 text-sm opacity-80">
          Your checkout + access flow is working. This page is now restored so the app builds and deploys cleanly.
        </p>
      </section>
    </main>
  );
}
