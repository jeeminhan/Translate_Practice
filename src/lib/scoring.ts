import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ScoreResult, FeedbackMode } from "@/types";

const QUICK_PROMPT = `You are a Japanese-to-English translation evaluator. Given the original Japanese text and a user's English translation, evaluate the translation on its own merits.

Respond in JSON format:
{
  "score": <1-10>,
  "feedback": "<one sentence of feedback>",
  "referenceSample": "<a natural sample translation for learning>"
}

Score guide: 9-10 excellent, 7-8 good, 5-6 acceptable, 3-4 partial, 1-2 missed.`;

const DETAILED_PROMPT = `You are a Japanese-to-English translation evaluator. Given the original Japanese text and a user's English translation, evaluate the translation on its own merits. Do NOT compare against a fixed reference.

Evaluate on:
1. Meaning Accuracy (does it capture the core meaning?)
2. Completeness (any significant omissions or additions?)
3. Naturalness (does the English sound natural, not stilted/literal?)
4. Nuance (register, emotion, emphasis preserved?)

Respond in JSON format:
{
  "score": <1-10>,
  "feedback": "<2-3 sentences with specific notes on what was good and what could improve>",
  "referenceSample": "<a natural sample translation for learning>",
  "dimensions": {
    "meaningAccuracy": <1-10>,
    "completeness": <1-10>,
    "naturalness": <1-10>,
    "nuance": <1-10>
  }
}

Score guide: 9-10 excellent, 7-8 good, 5-6 acceptable, 3-4 partial, 1-2 missed.`;

export async function scoreTranslation(
  japaneseText: string,
  userTranslation: string,
  mode: FeedbackMode,
  apiKey: string
): Promise<ScoreResult> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const systemPrompt = mode === "quick" ? QUICK_PROMPT : DETAILED_PROMPT;
  const combinedPrompt = `${systemPrompt}\n\nTask: Evaluate the following translation.\nJapanese: ${japaneseText}\n\nUser's translation: ${userTranslation}\n\nIMPORTANT: Respond ONLY with a valid JSON object.`;

  try {
    const result = await model.generateContent(combinedPrompt);

    let text = result.response.text();
    text = text.replace(/```json\n?/, "").replace(/\n?```/, "").trim();

    const parsed = JSON.parse(text);
    return {
      score: parsed.score,
      feedback: parsed.feedback,
      referenceSample: parsed.referenceSample,
      dimensions: parsed.dimensions,
    };
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    const isRateLimit = errorMsg.includes("429") || errorMsg.includes("Resource exhausted");
    const isNotFound = errorMsg.includes("404") || errorMsg.includes("not found");

    console.error("Gemini API error:", errorMsg);

    let feedback: string;
    if (isRateLimit) {
      feedback = "Rate limit reached — you may be on the Gemini free tier (15 req/min). Check Google AI Studio billing settings to use your paid credits. Please wait a moment and try again.";
    } else if (isNotFound) {
      feedback = "The Gemini model was not found. Please check your API configuration.";
    } else {
      feedback = `Gemini API error: ${errorMsg}`;
    }

    return {
      score: 0,
      feedback,
      referenceSample: "",
      dimensions: mode === "detailed" ? {
        meaningAccuracy: 0,
        completeness: 0,
        naturalness: 0,
        nuance: 0
      } : undefined
    };
  }
}
