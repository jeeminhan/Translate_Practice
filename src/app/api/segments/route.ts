import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { segments, attempts } from "@/lib/db/schema";
import { eq, asc, sql } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get("videoId");
  if (!videoId) {
    return NextResponse.json(
      { error: "videoId is required" },
      { status: 400 }
    );
  }

  try {
    const segs = db
      .select({
        id: segments.id,
        videoId: segments.videoId,
        position: segments.position,
        startTime: segments.startTime,
        endTime: segments.endTime,
        japaneseText: segments.japaneseText,
        englishRef: segments.englishRef,
        hasEnglishRef: segments.hasEnglishRef,
        bestScore: sql<number | null>`(
          SELECT MAX(a.score) FROM attempts a WHERE a.segment_id = segments.id
        )`,
        attemptCount: sql<number>`(
          SELECT COUNT(*) FROM attempts a WHERE a.segment_id = segments.id
        )`,
      })
      .from(segments)
      .where(eq(segments.videoId, videoId))
      .orderBy(asc(segments.position))
      .all();

    return NextResponse.json(segs);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch segments";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, japaneseText, englishRef } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (japaneseText !== undefined) updates.japaneseText = japaneseText;
    if (englishRef !== undefined) {
      updates.englishRef = englishRef;
      updates.hasEnglishRef = !!englishRef;
    }

    db.update(segments).set(updates).where(eq(segments.id, id)).run();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update segment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    db.delete(segments).where(eq(segments.id, id)).run();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete segment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Merge segments
export async function POST(req: NextRequest) {
  try {
    const { action, segmentIds } = await req.json();

    if (action === "merge" && Array.isArray(segmentIds) && segmentIds.length >= 2) {
      const segsToMerge = db
        .select()
        .from(segments)
        .where(
          sql`${segments.id} IN (${sql.join(
            segmentIds.map((id: string) => sql`${id}`),
            sql`, `
          )})`
        )
        .orderBy(asc(segments.position))
        .all();

      if (segsToMerge.length < 2) {
        return NextResponse.json(
          { error: "Could not find segments to merge" },
          { status: 400 }
        );
      }

      const merged = {
        id: uuid(),
        videoId: segsToMerge[0].videoId,
        position: segsToMerge[0].position,
        startTime: segsToMerge[0].startTime,
        endTime: segsToMerge[segsToMerge.length - 1].endTime,
        japaneseText: segsToMerge.map((s) => s.japaneseText).join(" "),
        englishRef: segsToMerge.every((s) => s.englishRef)
          ? segsToMerge.map((s) => s.englishRef).join(" ")
          : null,
        hasEnglishRef: segsToMerge.every((s) => s.hasEnglishRef),
      };

      // Delete old segments and insert merged one
      for (const seg of segsToMerge) {
        db.delete(segments).where(eq(segments.id, seg.id)).run();
      }
      db.insert(segments).values(merged).run();

      return NextResponse.json({ success: true, mergedId: merged.id });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Operation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
