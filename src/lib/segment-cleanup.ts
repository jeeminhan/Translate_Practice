import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ParsedSubtitle } from "@/types";

const BATCH_SIZE = 20;

const NON_DIALOGUE_PATTERNS = [
  /^\[.*\]$/,       // [音楽], [拍手], etc.
  /^♪+$/,           // music notes
  /^（.*）$/,        // （音楽）, etc.
  /^\(.*\)$/,       // (music), etc.
];

function isNonDialogue(text: string): boolean {
  const trimmed = text.trim();
  return NON_DIALOGUE_PATTERNS.some((p) => p.test(trimmed));
}

const CLEANUP_PROMPT = `You are a subtitle segment merger. Given raw auto-generated Japanese subtitle segments with indices, group them into natural, complete Japanese sentences.

Rules:
- Merge fragments that are part of the same sentence into one group
- A sentence is NOT complete until it has its final verb ending. Segments that are just verb endings like "ます。", "です。", "ました。", "ません。", "でした。", "ですね", "ますよ", "たい", "ている" etc. MUST be merged with the preceding segment(s) — they are never standalone sentences.
- Similarly, sentence-final particles (よ, ね, な, わ, ぞ, さ, か) alone must be merged with preceding segments.
- Keep segments that are already complete sentences as-is
- Never reorder segments — groups must be contiguous ranges
- Return ONLY a JSON array where each item has "startIndex" and "endIndex" (inclusive, 0-based into this batch)

Example input:
0: "今日は天気が"
1: "いいですね"
2: "この2人には何か他とは違うものを感じ"
3: "ます。"
4: "明日は雨です"

Example output:
[{"startIndex":0,"endIndex":1},{"startIndex":2,"endIndex":3},{"startIndex":4,"endIndex":4}]

IMPORTANT: Respond ONLY with a valid JSON array. Every segment index must be covered exactly once.`;

interface MergeGroup {
  startIndex: number;
  endIndex: number;
}

async function cleanupBatch(
  batch: ParsedSubtitle[],
  model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>
): Promise<ParsedSubtitle[]> {
  const indexed = batch.map((seg, i) => `${i}: "${seg.text}"`).join("\n");
  const prompt = `${CLEANUP_PROMPT}\n\nSegments:\n${indexed}`;

  try {
    const result = await model.generateContent(prompt);
    let text = result.response.text();
    text = text.replace(/```json\n?/, "").replace(/\n?```/, "").trim();

    const groups: MergeGroup[] = JSON.parse(text);

    return groups.map((group) => {
      const sliced = batch.slice(group.startIndex, group.endIndex + 1);
      return {
        startTime: sliced[0].startTime,
        endTime: sliced[sliced.length - 1].endTime,
        text: sliced.map((s) => s.text).join(""),
      };
    });
  } catch (e) {
    console.error("Segment cleanup batch failed, returning original segments:", e);
    return batch;
  }
}

const SENTENCE_ENDINGS = /[。！？!?…」』)）～〜]$/;

function mergeIncompleteSegments(segments: ParsedSubtitle[]): ParsedSubtitle[] {
  if (segments.length === 0) return [];

  const merged: ParsedSubtitle[] = [];
  let current = { ...segments[0] };

  for (let i = 1; i < segments.length; i++) {
    if (SENTENCE_ENDINGS.test(current.text.trim())) {
      // Current segment looks complete — push it and start fresh
      merged.push(current);
      current = { ...segments[i] };
    } else {
      // Current segment is incomplete — merge next into it
      current = {
        startTime: current.startTime,
        endTime: segments[i].endTime,
        text: current.text + segments[i].text,
      };
    }
  }
  merged.push(current);

  return merged;
}

export async function cleanupSegments(
  segments: ParsedSubtitle[],
  apiKey: string
): Promise<ParsedSubtitle[]> {
  // Filter out non-dialogue segments first
  const dialogue = segments.filter((seg) => !isNonDialogue(seg.text));

  if (dialogue.length === 0) return [];

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const batchResults: ParsedSubtitle[] = [];

  for (let i = 0; i < dialogue.length; i += BATCH_SIZE) {
    const batch = dialogue.slice(i, i + BATCH_SIZE);
    const cleaned = await cleanupBatch(batch, model);
    batchResults.push(...cleaned);
  }

  // Post-process: merge any segment that doesn't end with sentence-final
  // punctuation into the next segment. This fixes splits at batch boundaries.
  return mergeIncompleteSegments(batchResults);
}
