"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const DEMO_QUESTIONS = [
  {
    question: "What is the minimum size copper equipment grounding conductor for a 100‑amp overcurrent device?",
    choices: ["#10 AWG", "#8 AWG", "#6 AWG", "#4 AWG"],
    answer: 1,
    explanation:
      "NEC Table 250.122 sizes the equipment grounding conductor based on the rating of the overcurrent device. For a 100‑amp device the minimum copper EGC is #8 AWG.",
  },
  {
    question: "What NEC article primarily covers photovoltaic systems?",
    choices: ["Article 240", "Article 690", "Article 250", "Article 430"],
    answer: 1,
    explanation:
      "Photovoltaic systems are covered in NEC Article 690.",
  },
  {
    question: "What is the minimum working clearance in front of 120‑240V equipment under normal conditions?",
    choices: ["24 inches", "30 inches", "36 inches", "42 inches"],
    answer: 2,
    explanation:
      "NEC 110.26 generally requires 36 inches of working clearance for 120‑240V equipment under typical conditions.",
  }
];

function LandingInner() {
  const router = useRouter();

  const demoQuestion = useMemo(() => {
    const index = Math.floor(Math.random() * DEMO_QUESTIONS.length);
    return DEMO_QUESTIONS[index];
  }, []);

  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function startCheckout() {
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
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-10 px-6 py-10 text-white">
      <section className="grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-center">
        <div>
          <div className="mb-4 inline-flex rounded-full border border-yellow-400/40 bg-yellow-400/10 px-4 py-1 text-sm font-semibold text-yellow-300">
            Built for electricians. Built to pass.
          </div>

          <h1 className="max-w-3xl text-5xl font-extrabold leading-tight text-white">
            Pass Your Journeyman Exam the First Time.
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/80">
            Real NEC-style exam simulations, timed practice tests, and clear
            step-by-step explanations built for working electricians.
          </p>

          <p className="mt-4 text-base font-semibold text-yellow-300">
            Built by a 24-year electrician who knows the exam.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button className="mizo-btn" onClick={startCheckout}>
              Start Training — $79/month
            </button>

            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Login
            </Link>
          </div>

          <div className="mt-4 space-y-1 text-sm text-white/70">
            <div>Cancel anytime.</div>
            <div>✔ 30-Day Confidence Guarantee</div>
            <div>✔ Get an additional month free if you’re not satisfied</div>
          </div>

          <div className="mt-6 rounded-lg border border-yellow-300/30 bg-white p-4 text-lg font-extrabold text-black">
            🔒 Simulator access is Pro-only. Start training to unlock.
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl">
          <div className="text-sm font-semibold uppercase tracking-wide text-yellow-300">
            Why electricians choose Mizo
          </div>
          <ul className="mt-5 space-y-4 text-base text-white/85">
            <li>✔ NEC-referenced questions</li>
            <li>✔ Timed exam simulator</li>
            <li>✔ Clear calculation walkthroughs</li>
            <li>✔ Built by an experienced electrician</li>
            <li>✔ Texas first, nationwide next</li>
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-8">
        <h2 className="text-3xl font-extrabold text-white">
          Try a Real Mizo Question
        </h2>

        <p className="mt-2 text-white/70">
          This is a sample from the simulator. Each visit shows a different question.
        </p>

        <div className="mt-6 text-lg font-semibold text-white">
          {demoQuestion.question}
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {demoQuestion.choices.map((choice, i) => (
            <button
              key={i}
              onClick={() => {
                setSelected(i);
                setSubmitted(false);
              }}
              className={`rounded-xl border px-4 py-3 text-left font-semibold transition ${
                selected === i
                  ? "border-yellow-400 bg-yellow-400/20"
                  : "border-white/10 bg-black/30 hover:bg-black/40"
              }`}
            >
              {choice}
            </button>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            className="mizo-btn"
            disabled={selected === null}
            onClick={() => setSubmitted(true)}
          >
            Check Answer
          </button>

          <button
            className="rounded-xl border border-white/20 px-5 py-3 font-bold"
            onClick={startCheckout}
          >
            Unlock Full Simulator
          </button>
        </div>

        {submitted && (
          <div className="mt-6 rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="font-bold text-yellow-300">
              Correct Answer: {demoQuestion.choices[demoQuestion.answer]}
            </div>
            <p className="mt-2 text-white/80">{demoQuestion.explanation}</p>
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white p-6 text-black shadow-sm">
          <div className="text-sm font-bold uppercase tracking-wide text-black/60">1</div>
          <h2 className="mt-2 text-xl font-bold">Practice real questions</h2>
          <p className="mt-3 text-sm leading-7 text-black/75">
            Train with exam-style questions that build code navigation, confidence, and speed.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white p-6 text-black shadow-sm">
          <div className="text-sm font-bold uppercase tracking-wide text-black/60">2</div>
          <h2 className="mt-2 text-xl font-bold">Take timed simulations</h2>
          <p className="mt-3 text-sm leading-7 text-black/75">
            Stop guessing how ready you are. Practice under real pressure before exam day.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white p-6 text-black shadow-sm">
          <div className="text-sm font-bold uppercase tracking-wide text-black/60">3</div>
          <h2 className="mt-2 text-xl font-bold">Walk in prepared</h2>
          <p className="mt-3 text-sm leading-7 text-black/75">
            Build the pace and confidence needed to pass the Journeyman exam the first time.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-8 text-center">
        <div className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-300">
          30-Day Confidence Guarantee
        </div>
        <h2 className="mt-3 text-3xl font-extrabold text-white">
          Get an Additional Month Free if You’re Not Satisfied
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-white/80">
          If after your first month you don’t feel significantly more prepared for the Journeyman exam, we’ll give you an additional month free.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button className="mizo-btn" onClick={startCheckout}>
            Start Training
          </button>

          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
          >
            Login
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LandingInner />
    </Suspense>
  );
}