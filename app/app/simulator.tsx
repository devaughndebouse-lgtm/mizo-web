"use client";

import { useMemo, useState } from "react";

type Choice = {
  id: string;
  text: string;
  explanation: string;
};

type Question = {
  id: string;
  prompt: string;
  choices: Choice[];
  correctChoiceId: string;
  reference?: string;
};

const QUESTIONS: Question[] = [
  {
    id: "q1",
    prompt: "Sample question: What is 12 × 8?",
    correctChoiceId: "b",
    choices: [
      { id: "a", text: "84", explanation: "12 × 8 = 96, not 84." },
      { id: "b", text: "96", explanation: "Correct: 12 × 8 = 96." },
      { id: "c", text: "108", explanation: "12 × 9 = 108." },
      { id: "d", text: "112", explanation: "14 × 8 = 112." },
    ],
  },
  {
    id: "q2",
    prompt:
      "Sample question: A circuit has 10A of load at 120V. What is the power?",
    correctChoiceId: "c",
    choices: [
      { id: "a", text: "10W", explanation: "Power = V × I, not I only." },
      { id: "b", text: "120W", explanation: "120V × 1A = 120W." },
      { id: "c", text: "1200W", explanation: "Correct: 120V × 10A = 1200W." },
      { id: "d", text: "12,000W", explanation: "That would be 120V × 100A." },
    ],
  },
  {
    id: "q3",
    prompt:
      "Sample question: If a test has 20 questions and you answer 15 correctly, what is your score?",
    correctChoiceId: "a",
    choices: [
      { id: "a", text: "75%", explanation: "15 / 20 = 0.75 = 75%." },
      { id: "b", text: "70%", explanation: "70% would be 14/20." },
      { id: "c", text: "80%", explanation: "80% would be 16/20." },
      { id: "d", text: "85%", explanation: "85% would be 17/20." },
    ],
  },
];

export function Simulator() {
  const questions = useMemo(() => QUESTIONS, []);
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const current = questions[index];
  const picked = answers[current.id] ?? null;

  const score = useMemo(() => {
    let correct = 0;
    for (const q of questions) {
      if (answers[q.id] === q.correctChoiceId) correct += 1;
    }
    return { correct, total: questions.length };
  }, [answers, questions]);

  function pick(choiceId: string) {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [current.id]: choiceId }));
  }

  function next() {
    setIndex((i) => Math.min(i + 1, questions.length - 1));
  }

  function prev() {
    setIndex((i) => Math.max(i - 1, 0));
  }

  function reset() {
    setStarted(false);
    setSubmitted(false);
    setIndex(0);
    setAnswers({});
  }

  if (!started) {
    return (
      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-extrabold">Exam Simulator</h2>
        <p className="mt-1 text-sm text-black/70">
          This is a working demo simulator (sample questions). Plug in your real
          question bank next.
        </p>
        <button className="mizo-btn mt-4" onClick={() => setStarted(true)}>
          Start simulation
        </button>
      </section>
    );
  }

  if (submitted) {
    const percent = Math.round((score.correct / score.total) * 100);
    return (
      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-extrabold">Results</h2>
        <p className="mt-1 text-sm text-black/70">
          Score:{" "}
          <span className="font-bold text-black">
            {score.correct}/{score.total} ({percent}%)
          </span>
        </p>

        <div className="mt-4 grid gap-3">
          {questions.map((q) => {
            const pickedId = answers[q.id] ?? null;
            const ok = pickedId === q.correctChoiceId;
            return (
              <div key={q.id} className="rounded-lg border bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-semibold">{q.prompt}</div>
                  <div
                    className={`shrink-0 rounded px-2 py-1 text-xs font-bold ${
                      ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}
                  >
                    {ok ? "Correct" : "Missed"}
                  </div>
                </div>
                <div className="mt-2 text-xs text-black/70">
                  Your answer:{" "}
                  <span className="font-semibold text-black">
                    {q.choices.find((c) => c.id === pickedId)?.text ?? "—"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button className="mizo-btn" onClick={reset}>
            Start over
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-black/60">
            Question {index + 1} of {questions.length}
          </div>
          <h2 className="mt-1 text-lg font-extrabold">Simulation</h2>
        </div>
        <button
          className="rounded border border-black bg-white px-3 py-2 text-xs font-bold text-black"
          onClick={reset}
        >
          Reset
        </button>
      </div>

      <div className="mt-4 text-base font-semibold">{current.prompt}</div>
      {current.reference ? (
        <div className="mt-1 text-xs text-black/60">{current.reference}</div>
      ) : null}

      <div className="mt-4 grid gap-2">
        {current.choices.map((c) => {
          const isPicked = picked === c.id;
          const showExplanation = picked === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => pick(c.id)}
              className={`rounded-lg border px-3 py-3 text-left text-sm font-semibold transition ${
                isPicked ? "border-black bg-yellow-50" : "bg-white hover:bg-black/5"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="mt-[2px] inline-flex h-5 w-5 items-center justify-center rounded border text-xs font-extrabold">
                  {c.id.toUpperCase()}
                </span>
                <span className="flex-1">{c.text}</span>
              </div>
              {showExplanation ? (
                <div className="mt-2 text-xs font-medium text-black/70">
                  {c.explanation}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          className="rounded border border-black bg-white px-3 py-2 text-sm font-bold text-black disabled:opacity-50"
          onClick={prev}
          disabled={index === 0}
        >
          Back
        </button>
        <button
          className="rounded border border-black bg-white px-3 py-2 text-sm font-bold text-black disabled:opacity-50"
          onClick={next}
          disabled={index === questions.length - 1}
        >
          Next
        </button>
        <button
          className="mizo-btn disabled:opacity-50"
          onClick={() => setSubmitted(true)}
          disabled={Object.keys(answers).length < questions.length}
        >
          Submit
        </button>

        <div className="ml-auto text-xs font-semibold text-black/70">
          Answered {Object.keys(answers).length}/{questions.length}
        </div>
      </div>
    </section>
  );
}

