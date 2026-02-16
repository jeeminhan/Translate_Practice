import { NextRequest, NextResponse } from "next/server";
import { extractSubtitles } from "@/lib/youtube";
import { db } from "@/lib/db";
import { videos, segments } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const result = await extractSubtitles(url);

    // Create video record
    const videoId = uuid();
    const now = new Date().toISOString();

    db.insert(videos).values({
      id: videoId,
      title: result.title,
      sourceType: "youtube",
      sourceUrl: url,
      direction: "jp_to_en",
      createdAt: now,
      updatedAt: now,
    }).run();

    // Create segment records
    const segmentRecords = result.japaneseSegments.map((seg, i) => {
      // Try to find matching English subtitle by time overlap
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
      for (const record of segmentRecords) {
        db.insert(segments).values(record).run();
      }
    }

    return NextResponse.json({
      videoId,
      title: result.title,
      segmentCount: segmentRecords.length,
      hasEnglishSubs: result.hasEnglishSubs,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to extract subtitles";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
