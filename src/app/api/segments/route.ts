import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { segments, attempts } from "@/lib/db/schema";
import { eq, asc, sql } from "drizzle-orm";
import { v4 as uuid } from "uuid";

import { getAuthUser } from "@/lib/auth";
import { videos as videosTable } from "@/lib/db/schema";

export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get("videoId");
  if (!videoId) {
    return NextResponse.json({ error: "videoId is required" }, { status: 400 });
  }

  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const segs = await db
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
        lastTranslation: sql<string | null>`(
          SELECT a.user_translation FROM attempts a WHERE a.segment_id = segments.id ORDER BY a.created_at DESC LIMIT 1
        )`,
        lastFeedbackJson: sql<string | null>`(
          SELECT a.feedback_json FROM attempts a WHERE a.segment_id = segments.id ORDER BY a.created_at DESC LIMIT 1
        )`,
      })
      .from(segments)
      .where(eq(segments.videoId, videoId))
      .orderBy(asc(segments.position));

    return NextResponse.json(segs);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch segments";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, japaneseText, englishRef } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Verify ownership
    const segment = (await db.select().from(segments).where(eq(segments.id, id)))[0];
    if (!segment) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const video = (await db.select().from(videosTable).where(eq(videosTable.id, segment.videoId)))[0];
    if (!video || video.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updates: Record<string, unknown> = {};
    if (japaneseText !== undefined) updates.japaneseText = japaneseText;
    if (englishRef !== undefined) {
      updates.englishRef = englishRef;
      updates.hasEnglishRef = !!englishRef;
    }

    await db.update(segments).set(updates).where(eq(segments.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update segment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Verify ownership
    const segment = (await db.select().from(segments).where(eq(segments.id, id)))[0];
    if (!segment) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const video = (await db.select().from(videosTable).where(eq(videosTable.id, segment.videoId)))[0];
    if (!video || video.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.delete(segments).where(eq(segments.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete segment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Merge segments
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, segmentIds } = await req.json();

    if (action === "merge" && Array.isArray(segmentIds) && segmentIds.length >= 2) {
      const segsToMerge = await db
        .select()
        .from(segments)
        .where(
          sql`${segments.id} IN (${sql.join(
            segmentIds.map((id: string) => sql`${id}`),
            sql`, `
          )})`
        )
        .orderBy(asc(segments.position));

      if (segsToMerge.length < 2) {
        return NextResponse.json({ error: "Not enough segments to merge" }, { status: 400 });
      }

      // Verify ownership of the video
      const video = (await db.select().from(videosTable).where(eq(videosTable.id, segsToMerge[0].videoId)))[0];
      if (!video || video.userId !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
        await db.delete(segments).where(eq(segments.id, seg.id));
      }
      await db.insert(segments).values(merged);

      return NextResponse.json({ success: true, mergedId: merged.id });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Operation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
