import { NextRequest, NextResponse } from "next/server";
import { extractSubtitles } from "@/lib/youtube";
import { cleanupSegments } from "@/lib/segment-cleanup";
import { db } from "@/lib/db";
import { videos, segments } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import { getAuthUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const result = await extractSubtitles(url);

    // Clean up Japanese segments using AI to merge into natural sentences
    const apiKey = process.env.GOOGLE_AI_KEY || process.env.GEMINI_API_KEY;
    const japaneseSegments = apiKey
      ? await cleanupSegments(result.japaneseSegments, apiKey)
      : result.japaneseSegments;

    // Create video record
    const videoId = uuid();

    await db.insert(videos).values({
      id: videoId,
      userId: user.id,
      title: result.title,
      sourceType: "youtube",
      sourceUrl: url,
      direction: "jp_to_en",
    });

    // Create segment records
    const segmentRecords = japaneseSegments.map((seg, i) => {
      const matchingEn = result.englishSegments.find(
        (en) =>
          Math.abs(en.startTime - seg.startTime) < 2 &&
          Math.abs(en.endTime - seg.endTime) < 2
      );

      return {
        id: uuid(),
        videoId,
        position: i,
        startTime: seg.startTime,
        endTime: seg.endTime,
        japaneseText: seg.text,
        englishRef: matchingEn?.text ?? null,
        hasEnglishRef: !!matchingEn,
      };
    });

    if (segmentRecords.length > 0) {
      // PostgreSQL is much faster with bulk inserts
      await db.insert(segments).values(segmentRecords);
    }

    return NextResponse.json({
      videoId,
      title: result.title,
      segmentCount: segmentRecords.length,
      hasEnglishSubs: result.hasEnglishSubs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to extract subtitles";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
