import { NextRequest, NextResponse } from "next/server";
import { transcribePodcastAudio } from "@/lib/podcast";
import { db } from "@/lib/db";
import { videos, segments } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import { getAuthUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { audioUrl, title: titleOverride } = await req.json();
    if (!audioUrl?.trim()) return NextResponse.json({ error: "audioUrl is required" }, { status: 400 });

    const apiKey = process.env.GOOGLE_AI_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });

    const result = await transcribePodcastAudio(audioUrl, apiKey);
    const title = titleOverride?.trim() || result.title;
    const videoId = uuid();

    await db.insert(videos).values({
      id: videoId,
      userId: user.id,
      title,
      sourceType: "audio",
      sourceUrl: audioUrl,
      direction: "jp_to_en",
    });

    if (result.segments.length > 0) {
      await db.insert(segments).values(
        result.segments.map((seg, i) => ({
          id: uuid(),
          videoId,
          position: i,
          startTime: seg.startTime,
          endTime: seg.endTime,
          japaneseText: seg.japaneseText,
          englishRef: seg.englishRef ?? null,
          hasEnglishRef: !!seg.englishRef,
        }))
      );
    }

    return NextResponse.json({ videoId, title, segmentCount: result.segments.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Transcription failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
