import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TopicId =
  | "definitions"
  | "grounding"
  | "motors"
  | "conduit"
  | "voltage_drop"
  | "calculations";

type Difficulty = "easy" | "medium" | "hard";

type GeneratedQuestion = {
  topic: TopicId;
  difficulty: Difficulty;
  prompt: string;
  reference: string;
  correctChoiceId: "a" | "b" | "c" | "d";
  choices: Array<{
    id: "a" | "b" | "c" | "d";
    text: string;
    explanation: string;
  }>;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function extractJsonArray(text: string) {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model did not return a JSON array.");
  }
  return text.slice(start, end + 1);
}

function normalizeQuestions(input: unknown, topic: TopicId, difficulty: Difficulty) {
  if (!Array.isArray(input)) {
    throw new Error("Generated content is not an array.");
  }

  return input.map((item, index) => {
    const q = item as Partial<GeneratedQuestion> & {
      choices?: Array<Partial<GeneratedQuestion["choices"][number]>>;
    };

    if (!q.prompt || !q.reference || !q.correctChoiceId || !Array.isArray(q.choices) || q.choices.length !== 4) {
      throw new Error(`Question ${index + 1} is missing required fields.`);
    }

    const ids: Array<"a" | "b" | "c" | "d"> = ["a", "b", "c", "d"];

    const choices = ids.map((id, choiceIndex) => {
      const existing = q.choices?.[choiceIndex];
      return {
        id,
        text: String(existing?.text ?? "").trim(),
        explanation: String(existing?.explanation ?? "").trim(),
      };
    });

    if (choices.some((choice) => !choice.text || !choice.explanation)) {
      throw new Error(`Question ${index + 1} has an incomplete answer choice.`);
    }

    if (!ids.includes(q.correctChoiceId)) {
      throw new Error(`Question ${index + 1} has an invalid correctChoiceId.`);
    }

    return {
      topic,
      difficulty,
      prompt: String(q.prompt).trim(),
      reference: String(q.reference).trim(),
      correctChoiceId: q.correctChoiceId,
      choices,
    } satisfies GeneratedQuestion;
  });
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return jsonError("Missing OPENAI_API_KEY", 500);
    }

    const body = await req.json();
    const topic = String(body?.topic ?? "definitions") as TopicId;
    const difficulty = String(body?.difficulty ?? "medium") as Difficulty;
    const count = Math.max(1, Math.min(20, Number(body?.count ?? 10)));

    const allowedTopics: TopicId[] = [
      "definitions",
      "grounding",
      "motors",
      "conduit",
      "voltage_drop",
      "calculations",
    ];
    const allowedDifficulties: Difficulty[] = ["easy", "medium", "hard"];

    if (!allowedTopics.includes(topic)) {
      return jsonError("Invalid topic", 400);
    }

    if (!allowedDifficulties.includes(difficulty)) {
      return jsonError("Invalid difficulty", 400);
    }

    const model = process.env.OPENAI_MODEL?.trim() || "gpt-5.4";

    const prompt = [
      `Generate ${count} NEC-style electrician exam practice questions as a JSON array only.`,
      `Topic: ${topic}.`,
      `Difficulty: ${difficulty}.`,
      "Audience: Texas journeyman electrician exam prep.",
      "Use clear, realistic exam language.",
      "Every object in the array must have exactly these keys:",
      'prompt, reference, correctChoiceId, choices',
      "correctChoiceId must be one of: a, b, c, d.",
      "choices must be an array of 4 items in order a, b, c, d.",
      "Each choice must have: text, explanation.",
      "The explanations should be short and practical.",
      "Do not wrap the JSON in markdown fences.",
      "Do not include any extra commentary before or after the JSON array.",
    ].join(" ");

    const openaiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: prompt,
      }),
    });

    if (!openaiRes.ok) {
      const errorText = await openaiRes.text();
      return jsonError(`OpenAI request failed: ${errorText}`, 500);
    }

    const responseJson = await openaiRes.json();
    const outputText = String(responseJson?.output_text ?? "").trim();
    if (!outputText) {
      return jsonError("OpenAI returned empty output", 500);
    }

    const parsed = JSON.parse(extractJsonArray(outputText));
    const questions = normalizeQuestions(parsed, topic, difficulty);

    return NextResponse.json(
      {
        ok: true,
        model,
        topic,
        difficulty,
        count: questions.length,
        questions,
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate questions";
    return jsonError(message, 500);
  }
}
