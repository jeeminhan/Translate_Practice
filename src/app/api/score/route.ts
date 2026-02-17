import { NextRequest, NextResponse } from "next/server";
import { scoreTranslation } from "@/lib/scoring";
import { db } from "@/lib/db";
import { attempts } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import type { FeedbackMode } from "@/types";
import { getAuthUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { japaneseText, userTranslation, segmentId, mode } = await req.json();

    if (!japaneseText || !userTranslation) {
      return NextResponse.json(
        { error: "japaneseText and userTranslation are required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const feedbackMode: FeedbackMode = mode === "detailed" ? "detailed" : "quick";
    const result = await scoreTranslation(
      japaneseText,
      userTranslation,
      feedbackMode,
      apiKey
    );

    // Save attempt to database if segmentId provided
    if (segmentId) {
      await db.insert(attempts)
        .values({
          id: uuid(),
          userId: user.id,
          segmentId,
          userTranslation,
          score: result.score,
          feedbackJson: JSON.stringify(result),
          feedbackMode,
        });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scoring failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
