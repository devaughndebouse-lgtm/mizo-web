"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";

const DEMO_QUESTIONS = [
  {
    question:
      "What is the minimum size copper equipment grounding conductor for a 100-amp overcurrent device?",
    choices: ["#10 AWG", "#8 AWG", "#6 AWG", "#4 AWG"],
    answer: 1,
    explanation:
      "NEC Table 250.122 sizes the equipment grounding conductor based on the rating of the overcurrent device. For a 100-amp device the minimum copper EGC is #8 AWG.",
  },
  {
    question: "What NEC article primarily covers photovoltaic systems?",
    choices: ["Article 240", "Article 690", "Article 250", "Article 430"],
    answer: 1,
    explanation:
      "Photovoltaic systems are covered in NEC Article 690.",
  },
  {
    question:
      "What is the minimum working clearance in front of 120-240V equipment under normal conditions?",
    choices: ["24 inches", "30 inches", "36 inches", "42 inches"],
    answer: 2,
    explanation:
      "NEC 110.26 generally requires 36 inches of working clearance for 120-240V equipment under typical conditions.",
  },
];

const BENEFITS = [
  "NEC-referenced questions",
  "Timed exam simulator",
  "Clear calculation walkthroughs",
  "Built by an experienced electrician",
  "Texas first, nationwide next",
];

const STEPS = [
  {
    number: "1",
    title: "Practice real questions",
    description:
      "Train with exam-style questions that build code navigation, confidence, and speed.",
  },
  {
    number: "2",
    title: "Take timed simulations",
    description:
      "Stop guessing how ready you are. Practice under real pressure before exam day.",
  },
  {
    number: "3",
    title: "Walk in prepared",
    description:
      "Build the pace and confidence needed to pass the Journeyman exam the first time.",
  },
];

function LandingInner() {
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
    <main className="min-h-screen bg-neutral-100 text-neutral-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="overflow-hidden rounded-[28px] border border-yellow-200 bg-white shadow-sm">
          <div className="grid gap-10 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:px-12 lg:py-14">
            <div className="max-w-2xl">
              <div className="inline-flex rounded-full border border-yellow-300 bg-yellow-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-yellow-700 sm:text-sm">
                Built for electricians. Built to pass.
              </div>

              <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight text-neutral-950 sm:text-5xl lg:text-6xl">
                Pass Your Journeyman Exam the First Time.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-700 sm:text-lg sm:leading-8">
                Real NEC-style exam simulations, timed practice tests, and clear
                step-by-step explanations built for working electricians.
              </p>

              <p className="mt-4 text-sm font-semibold text-yellow-700 sm:text-base">
                Built by a 24-year electrician who knows the exam.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button className="mizo-btn" onClick={startCheckout}>
                  Start Training — $79/month
                </button>

                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-xl border border-neutral-300 bg-white px-5 py-3 text-sm font-bold text-neutral-900 transition hover:bg-neutral-50"
                >
                  Login
                </Link>
              </div>

              <div className="mt-5 space-y-2 text-sm text-neutral-700">
                <div>Cancel anytime.</div>
                <div>✔ 30-Day Confidence Guarantee</div>
                <div>✔ Get an additional month free if you’re not satisfied</div>
              </div>

              <div className="mt-6 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm font-semibold text-neutral-900 sm:text-base">
                <span className="font-extrabold">
                  🔒 Simulator access is Pro-only.
                </span>{" "}
                Start training to unlock.
              </div>
            </div>

            <div className="lg:justify-self-end">
              <div className="rounded-[28px] border border-neutral-200 bg-neutral-950 p-4 shadow-2xl sm:p-5">
                <div className="rounded-[22px] bg-white p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-700">
                        Why electricians choose Mizo
                      </div>
                      <h2 className="mt-1 text-lg font-black text-neutral-950">
                        Built for real exam prep
                      </h2>
                    </div>
                    <div className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-800">
                      Pro
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3">
                    {BENEFITS.map((item) => (
                      <div
                        key={item}
                        className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3"
                      >
                        <span className="mt-0.5 text-lg font-black text-yellow-600">
                          ✓
                        </span>
                        <span className="text-sm font-semibold leading-6 text-neutral-800">
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm sm:p-8">
          <h2 className="text-3xl font-black text-neutral-950">
            Try a Real Mizo Question
          </h2>

          <p className="mt-2 text-sm leading-7 text-neutral-600 sm:text-base">
            This is a sample from the simulator. Each visit shows a different
            question.
          </p>

          <div className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-base font-semibold leading-7 text-neutral-900 sm:text-lg">
            {demoQuestion.question}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {demoQuestion.choices.map((choice, i) => (
              <button
                key={i}
                onClick={() => {
                  setSelected(i);
                  setSubmitted(false);
                }}
                className={`rounded-2xl border px-4 py-3 text-left font-semibold transition ${
                  selected === i
                    ? "border-yellow-400 bg-yellow-50 text-neutral-950"
                    : "border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50"
                }`}
              >
                {choice}
              </button>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              className="mizo-btn"
              disabled={selected === null}
              onClick={() => setSubmitted(true)}
            >
              Check Answer
            </button>

            <button
              className="inline-flex items-center justify-center rounded-xl border border-neutral-300 bg-white px-5 py-3 font-bold text-neutral-900 transition hover:bg-neutral-50"
              onClick={startCheckout}
            >
              Unlock Full Simulator
            </button>
          </div>

          {submitted && (
            <div className="mt-6 rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
              <div className="font-bold text-yellow-800">
                Correct Answer: {demoQuestion.choices[demoQuestion.answer]}
              </div>
              <p className="mt-2 text-neutral-700">{demoQuestion.explanation}</p>
            </div>
          )}
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className="rounded-[24px] border border-neutral-200 bg-white p-6 text-black shadow-sm"
            >
              <div className="text-sm font-bold uppercase tracking-wide text-black/60">
                {step.number}
              </div>
              <h2 className="mt-2 text-xl font-black sm:text-2xl">
                {step.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-black/75">
                {step.description}
              </p>
            </div>
          ))}
        </section>

        <section className="rounded-[28px] border border-yellow-200 bg-yellow-50 p-6 text-center shadow-sm sm:p-8">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-700 sm:text-sm">
            30-Day Confidence Guarantee
          </div>

          <h2 className="mt-3 text-3xl font-black tracking-tight text-neutral-950 sm:text-4xl">
            Get an Additional Month Free if You’re Not Satisfied
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-neutral-700 sm:leading-8">
            If after your first month you don’t feel significantly more prepared
            for the Journeyman exam, we’ll give you an additional month free.
          </p>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
            <button className="mizo-btn" onClick={startCheckout}>
              Start Training
            </button>

            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border border-neutral-300 bg-white px-5 py-3 text-sm font-bold text-neutral-900 transition hover:bg-neutral-50"
            >
              Login
            </Link>
          </div>
        </section>

        <footer className="rounded-[28px] border border-neutral-200 bg-white px-5 py-6 text-center shadow-sm sm:px-8">
          <p className="text-sm font-semibold text-neutral-900">
            © 2026 Mizo Mastery • A product of INM Unlimited LLC
          </p>

          <p className="mt-2 text-sm text-neutral-600">
            Contact: inm.unlimited.llc@gmail.com
          </p>

          <p className="mx-auto mt-3 max-w-3xl text-xs leading-6 text-neutral-500 sm:text-sm">
            Mizo Mastery is an educational training platform and is not affiliated
            with NEC, NFPA, PSI, or any licensing authority.
          </p>

          <div className="mt-5 flex flex-col items-center justify-center gap-3 text-sm font-bold text-neutral-700 sm:flex-row sm:flex-wrap sm:gap-5">
            <Link href="/terms" className="hover:text-neutral-950">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-neutral-950">
              Privacy
            </Link>
            <Link href="/refund" className="hover:text-neutral-950">
              Refund
            </Link>
            <Link href="/contact" className="hover:text-neutral-950">
              Contact
            </Link>
          </div>
        </footer>
      </div>
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