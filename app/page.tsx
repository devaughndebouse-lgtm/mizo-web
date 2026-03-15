"use client";

import { Suspense, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type DemoQuestion = {
  question: string;
  choices: string[];
  answer: number;
  explanation: string;
};

const JOURNEYMAN_DEMO_QUESTIONS: DemoQuestion[] = [
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

const MASTER_DEMO_QUESTIONS: DemoQuestion[] = [
  {
    question:
      "For a 277/480V, 3-phase, 4-wire wye service with a calculated load of 360 amperes, what is the minimum standard ampere rating permitted for the service disconnecting means?",
    choices: ["400A", "350A", "450A", "500A"],
    answer: 0,
    explanation:
      "Per NEC 230.79 and standard ampere ratings in 240.6(A), a calculated service load of 360A requires a disconnect rating of at least 400A.",
  },
  {
    question:
      "Which NEC article is the primary starting point for sizing grounded conductors for services and feeders when doing advanced load and demand work?",
    choices: ["Article 215", "Article 220", "Article 250", "Article 430"],
    answer: 1,
    explanation:
      "Article 220 is the core article for branch-circuit, feeder, and service load calculations and is central to master-level exam calculation work.",
  },
  {
    question:
      "When sizing grounding electrode conductor connections and reviewing bonding requirements for service equipment, which NEC article becomes especially important on master-level exams?",
    choices: ["Article 110", "Article 210", "Article 250", "Article 300"],
    answer: 2,
    explanation:
      "Article 250 governs grounding and bonding and is a major focus area on master electrician exams because of its depth and application complexity.",
  },
];

const BENEFITS = [
  "NEC-referenced questions",
  "Timed exam simulator",
  "Clear calculation walkthroughs",
  "Built by an experienced electrician",
  "Journeyman and Master exam prep",
];

const TRUST_ITEMS = [
  "Journeyman + Master prep",
  "Timed exam simulator",
  "Built by a 24-year electrician",
];

const EXAM_TRACKS = [
  {
    title: "Journeyman Electrician Simulator",
    description:
      "Practice NEC-style questions, timed simulations, and calculation walkthroughs built to help electricians prepare for the Journeyman exam.",
    price: "$49/month",
    cta: "Start Journeyman Training",
    source: "journeyman_track",
    badge: "Journeyman",
  },
  {
    title: "Master Electrician Simulator",
    description:
      "Train with a separate paid simulator built around a master-level question bank covering advanced code navigation, service and feeder calculations, grounding and bonding, and more complex commercial and industrial exam-style scenarios.",
    price: "$79/month",
    cta: "Start Master Training",
    source: "master_track",
    badge: "Master",
  },
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

const LEADERBOARD = [
  { name: "Marcus T.", score: "98%", badge: "Top Score" },
  { name: "Jalen R.", score: "95%", badge: "Fastest Climber" },
  { name: "Chris M.", score: "93%", badge: "Journeyman Track" },
  { name: "Andre P.", score: "91%", badge: "Consistent" },
  { name: "Luis G.", score: "89%", badge: "Rising" },
];

const TESTIMONIALS = [
  {
    name: "Derrick H.",
    role: "Apprentice Electrician",
    quote:
      "Mizo Mastery helped me get faster with code navigation and made the practice questions feel much closer to the real exam.",
  },
  {
    name: "Anthony W.",
    role: "Journeyman Candidate",
    quote:
      "The calculation breakdowns made a huge difference for me. I felt much more confident going into exam prep each night.",
  },
  {
    name: "Carlos R.",
    role: "Electrical Trainee",
    quote:
      "I like that I can jump in, train under pressure, and actually feel myself getting sharper instead of just rereading the code book.",
  },
];

const FAQS = [
  {
    question: "What do I get with Mizo Mastery?",
    answer:
      "You get NEC-style practice questions, timed exam simulations, and step-by-step explanations designed to help electricians prepare with confidence.",
  },
  {
    question: "Is Mizo Mastery for electricians nationwide?",
    answer:
      "Yes. Mizo Mastery is built for electricians nationwide, with exam-style practice designed to help users strengthen code navigation, calculations, and test readiness across the country.",
  },
  {
    question: "Can I cancel anytime?",
    answer: "Yes. You can cancel your subscription anytime.",
  },
  {
    question: "Who is this for?",
    answer:
      "Mizo Mastery is built for apprentices, journeyman candidates, and electricians who want better exam prep.",
  },
  {
    question: "Does it include timed practice exams?",
    answer:
      "Yes. Mizo Mastery includes timed practice to help you build speed, confidence, and exam-day readiness.",
  },
  {
    question: "Is the Master simulator built around master-level topics?",
    answer:
      "Yes. The Master Electrician simulator is designed around a more advanced question bank with deeper code navigation, tougher calculations, grounding and bonding work, and more complex commercial and industrial scenarios.",
  },
];

const JOURNEYMAN_PRICING_FEATURES = [
  "Unlimited NEC-style practice questions",
  "Timed exam simulations",
  "Step-by-step calculation walkthroughs",
  "Built for electricians preparing for the Journeyman exam",
  "30-Day Confidence Guarantee",
  "Cancel anytime",
];

const MASTER_PRICING_FEATURES = [
  "Master-level NEC question bank",
  "Advanced service and feeder calculations",
  "Grounding, bonding, and code navigation practice",
  "Commercial and industrial exam-style scenarios",
  "30-Day Confidence Guarantee",
  "Cancel anytime",
];

declare global {
  interface Window {
    plausible?: (
      eventName: string,
      options?: { props?: Record<string, string> }
    ) => void;
    gtag?: (
      command: "event",
      eventName: string,
      params?: Record<string, string>
    ) => void;
  }
}

function trackEvent(eventName: string, props?: Record<string, string>) {
  if (typeof window === "undefined") return;

  window.plausible?.(eventName, props ? { props } : undefined);
  window.gtag?.("event", eventName, props);
}

function LandingInner() {
  const [demoTrack, setDemoTrack] = useState<"journeyman" | "master">(
    "journeyman"
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const demoQuestion = useMemo(() => {
    const pool =
      demoTrack === "master"
        ? MASTER_DEMO_QUESTIONS
        : JOURNEYMAN_DEMO_QUESTIONS;
    const index = Math.floor(Math.random() * pool.length);
    return pool[index];
  }, [demoTrack]);

  function handleLoginClick(source: string) {
    trackEvent("login_click", { source });
  }

  function handleFreeQuestionsClick() {
    trackEvent("free_questions_click", { source: "homepage_free_questions" });
  }

  function handleAnswerCheck() {
    trackEvent("check_answer_click", {
      source: "homepage_demo_question",
      hasSelection: selected !== null ? "yes" : "no",
    });
    setSubmitted(true);
  }

  function handleChoiceSelect(index: number) {
    trackEvent("demo_choice_select", {
      source: "homepage_demo_question",
      choiceIndex: String(index),
    });
    setSelected(index);
    setSubmitted(false);
  }

  function handleDemoTrackChange(track: "journeyman" | "master") {
    trackEvent("demo_track_change", { track });
    setDemoTrack(track);
    setSelected(null);
    setSubmitted(false);
  }

  function handleFooterNavClick(destination: string) {
    trackEvent("footer_nav_click", { destination });
  }

  async function startCheckout(source: string) {
    trackEvent("start_training_click", { source });

    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ source }),
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
                step-by-step explanations built for working electricians across
                the country.
              </p>

              <p className="mt-4 text-sm font-semibold text-yellow-700 sm:text-base">
                Built by a 24-year electrician who knows the exam.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  className="mizo-btn"
                  onClick={() => startCheckout("hero_primary")}
                >
                  Start Training — $49/month
                </button>

                <Link
                  href="/login"
                  onClick={() => handleLoginClick("hero_secondary")}
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
              <div className="overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-sm">
                <div className="relative aspect-[4/3] w-full">
                  <Image
                    src="/hero-electrician.jpg"
                    alt="Electrician working on electrical equipment"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>

                <div className="p-5 sm:p-6">
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

        <section className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 text-center lg:flex-row lg:items-center lg:justify-between lg:text-left">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-700">
                Trusted Exam Prep
              </div>
              <h2 className="mt-2 text-2xl font-black text-neutral-950">
                Built for electricians getting ready to pass
              </h2>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center lg:justify-end">
              {TRUST_ITEMS.map((item) => (
                <div
                  key={item}
                  className="rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm font-bold text-neutral-800"
                >
                  ✓ {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="text-center">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-700">
              Choose Your Simulator
            </div>
            <h2 className="mt-2 text-3xl font-black text-neutral-950">
              Separate Paid Simulators for Journeyman and Master Prep
            </h2>
            <p className="mt-3 text-sm leading-7 text-neutral-700 sm:text-base">
              Choose the exam path you are preparing for and train inside the
              simulator built for that level.
            </p>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {EXAM_TRACKS.map((track) => (
              <div
                key={track.title}
                className="rounded-[28px] border border-neutral-200 bg-neutral-50 p-6 shadow-sm"
              >
                <div className="inline-flex rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-yellow-800">
                  {track.badge}
                </div>

                <h3 className="mt-4 text-2xl font-black text-neutral-950">
                  {track.title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-neutral-700 sm:text-base">
                  {track.description}
                </p>

                <div className="mt-5 text-3xl font-black text-neutral-950">
                  {track.price}
                </div>

                <button
                  className="mizo-btn mt-6"
                  onClick={() => startCheckout(track.source)}
                >
                  {track.cta}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-neutral-200 bg-white p-6 text-center shadow-sm">
          <h2 className="text-2xl font-black text-neutral-950">
            Free Electrician Practice Questions
          </h2>

          <p className="mt-3 text-neutral-700">
            Try a few real NEC-style practice questions before unlocking the full
            Mizo Mastery simulator.
          </p>

          <Link
            href="/electrician-practice-questions"
            onClick={handleFreeQuestionsClick}
            className="inline-block mt-5 rounded-xl bg-yellow-400 px-6 py-3 font-bold text-neutral-950 hover:bg-yellow-300"
          >
            Try Free Practice Questions
          </Link>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-sm">
            <div className="relative aspect-[16/10] w-full">
              <Image
                src="/electrician-blueprint.jpg"
                alt="Construction plans and tape measure on a work table"
                fill
                className="object-cover"
              />
            </div>
            <div className="p-6">
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-700">
                Train with purpose
              </div>
              <h2 className="mt-2 text-2xl font-black text-neutral-950">
                Practice that feels connected to real field work
              </h2>
              <p className="mt-3 text-sm leading-7 text-neutral-700 sm:text-base">
                Mizo is built for electricians who think in layouts, loads,
                equipment, and code decisions — not generic test prep.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-sm">
            <div className="relative aspect-[16/10] w-full">
              <Image
                src="/electrician-panel.jpg"
                alt="Electrician working inside an electrical panel"
                fill
                className="object-cover"
              />
            </div>
            <div className="p-6">
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-700">
                Built from the field
              </div>
              <h2 className="mt-2 text-2xl font-black text-neutral-950">
                Study with real electrician energy
              </h2>
              <p className="mt-3 text-sm leading-7 text-neutral-700 sm:text-base">
                Timed practice, NEC-style questions, and practical explanations
                help you build confidence before exam day.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm sm:p-8">
          <h2 className="text-3xl font-black text-neutral-950">
            Try a Sample Question Bank
          </h2>

          <p className="mt-2 text-sm leading-7 text-neutral-600 sm:text-base">
            Switch between Journeyman and Master sample questions. Each visit
            shows a different question from that exam track.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                demoTrack === "journeyman"
                  ? "bg-yellow-400 text-neutral-950"
                  : "border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50"
              }`}
              onClick={() => handleDemoTrackChange("journeyman")}
            >
              Journeyman Question Bank
            </button>
            <button
              className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                demoTrack === "master"
                  ? "bg-yellow-400 text-neutral-950"
                  : "border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50"
              }`}
              onClick={() => handleDemoTrackChange("master")}
            >
              Master Question Bank
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-base font-semibold leading-7 text-neutral-900 sm:text-lg">
            {demoQuestion.question}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {demoQuestion.choices.map((choice, i) => (
              <button
                key={i}
                onClick={() => handleChoiceSelect(i)}
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
              onClick={handleAnswerCheck}
            >
              Check Answer
            </button>

            <button
              className="inline-flex items-center justify-center rounded-xl border border-neutral-300 bg-white px-5 py-3 font-bold text-neutral-900 transition hover:bg-neutral-50"
              onClick={() => startCheckout("demo_question_secondary")}
            >
              Unlock Full Simulator
            </button>
          </div>

          {submitted && (
            <div className="mt-6 rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
              <div className="font-bold text-yellow-800">
                {demoTrack === "master" ? "Master" : "Journeyman"} Correct
                Answer: {demoQuestion.choices[demoQuestion.answer]}
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

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-700">
              Mizo Leaderboard
            </div>
            <h2 className="mt-2 text-3xl font-black text-neutral-950">
              Top Scores This Week
            </h2>
            <p className="mt-3 text-sm leading-7 text-neutral-700 sm:text-base">
              A little competition goes a long way. Show visitors that real
              electricians are training, improving, and climbing the board.
            </p>

            <div className="mt-6 space-y-4">
              {LEADERBOARD.map((entry, index) => (
                <div
                  key={entry.name}
                  className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-yellow-400 text-sm font-black text-neutral-950">
                      #{index + 1}
                    </div>
                    <div>
                      <p className="text-base font-bold text-neutral-950">
                        {entry.name}
                      </p>
                      <p className="text-sm text-neutral-600">{entry.badge}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-black text-neutral-950">
                      {entry.score}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-700">
              Testimonials
            </div>
            <h2 className="mt-2 text-3xl font-black text-neutral-950">
              Built for Electricians Who Want to Pass
            </h2>
            <p className="mt-3 text-sm leading-7 text-neutral-700 sm:text-base">
              Show visitors that Mizo is helping real people study smarter,
              build confidence, and stay sharp for exam day.
            </p>

            <div className="mt-6 space-y-4">
              {TESTIMONIALS.map((testimonial) => (
                <div
                  key={testimonial.name}
                  className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5"
                >
                  <p className="text-sm leading-7 text-neutral-700 sm:text-base">
                    “{testimonial.quote}”
                  </p>
                  <div className="mt-4">
                    <p className="font-bold text-neutral-950">
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-neutral-600">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="text-center">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-700">
              Pricing
            </div>
            <h2 className="mt-2 text-3xl font-black text-neutral-950">
              Paid Exam Simulators for Journeyman and Master Prep
            </h2>
            <p className="mt-3 text-sm leading-7 text-neutral-700 sm:text-base">
              Get access to separate paid simulators for Journeyman and Master
              electrician exam prep, including a dedicated master-level question
              bank built around tougher code work, calculations, and exam-style
              scenarios.
            </p>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-[28px] border border-yellow-200 bg-yellow-50 p-6 text-center">
              <div className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-700">
                Journeyman Simulator
              </div>
              <div className="mt-3 text-5xl font-black text-neutral-950">
                $49
                <span className="text-lg font-semibold text-neutral-700">
                  /month
                </span>
              </div>

              <p className="mt-3 text-sm font-semibold text-neutral-700">
                Built for electricians getting ready for the Journeyman exam.
              </p>

              <div className="mt-6 space-y-3 text-left">
                {JOURNEYMAN_PRICING_FEATURES.map((item) => (
                  <div
                    key={`journeyman-${item}`}
                    className="rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900"
                  >
                    ✓ {item}
                  </div>
                ))}
              </div>

              <button
                className="mizo-btn mt-6"
                onClick={() => startCheckout("pricing_journeyman")}
              >
                Start Journeyman Training
              </button>
            </div>

            <div className="rounded-[28px] border border-neutral-200 bg-white p-6 text-center shadow-sm">
              <div className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-700">
                Master Simulator
              </div>
              <div className="mt-3 text-5xl font-black text-neutral-950">
                $79
                <span className="text-lg font-semibold text-neutral-700">
                  /month
                </span>
              </div>

              <p className="mt-3 text-sm font-semibold text-neutral-700">
                Built for electricians preparing for the Master Electrician exam
                with a question bank that focuses on deeper code knowledge and
                tougher exam-style problems.
              </p>

              <div className="mt-6 space-y-3 text-left">
                {MASTER_PRICING_FEATURES.map((item) => (
                  <div
                    key={`master-${item}`}
                    className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-semibold text-neutral-900"
                  >
                    ✓ {item}
                  </div>
                ))}
              </div>

              <button
                className="mizo-btn mt-6"
                onClick={() => startCheckout("pricing_master")}
              >
                Start Master Training
              </button>
            </div>
          </div>
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
            <button
              className="mizo-btn"
              onClick={() => startCheckout("guarantee_primary")}
            >
              Start Training
            </button>

            <Link
              href="/login"
              onClick={() => handleLoginClick("guarantee_secondary")}
              className="inline-flex items-center justify-center rounded-xl border border-neutral-300 bg-white px-5 py-3 text-sm font-bold text-neutral-900 transition hover:bg-neutral-50"
            >
              Login
            </Link>
          </div>
        </section>

        <section className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-700">
            FAQ
          </div>
          <h2 className="mt-2 text-3xl font-black text-neutral-950">
            Frequently Asked Questions
          </h2>

          <div className="mt-6 space-y-4">
            {FAQS.map((faq) => (
              <div
                key={faq.question}
                className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5"
              >
                <h3 className="text-lg font-black text-neutral-950">
                  {faq.question}
                </h3>
                <p className="mt-2 text-sm leading-7 text-neutral-700 sm:text-base">
                  {faq.answer}
                </p>
              </div>
            ))}
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
            <Link
              href="/terms"
              onClick={() => handleFooterNavClick("terms")}
              className="hover:text-neutral-950"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              onClick={() => handleFooterNavClick("privacy")}
              className="hover:text-neutral-950"
            >
              Privacy
            </Link>
            <Link
              href="/refund"
              onClick={() => handleFooterNavClick("refund")}
              className="hover:text-neutral-950"
            >
              Refund
            </Link>
            <Link
              href="/contact"
              onClick={() => handleFooterNavClick("contact")}
              className="hover:text-neutral-950"
            >
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