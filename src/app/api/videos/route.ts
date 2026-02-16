import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { videos, segments, attempts } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export async function GET() {
  try {
    const allVideos = db
      .select({
        id: videos.id,
        title: videos.title,
        sourceType: videos.sourceType,
        sourceUrl: videos.sourceUrl,
        direction: videos.direction,
        createdAt: videos.createdAt,
        updatedAt: videos.updatedAt,
        segmentCount: sql<number>`(SELECT COUNT(*) FROM segments WHERE segments.video_id = videos.id)`,
        avgScore: sql<number | null>`(
          SELECT AVG(a.score) FROM attempts a
          JOIN segments s ON a.segment_id = s.id
          WHERE s.video_id = videos.id
        )`,
        lastPracticed: sql<string | null>`(
          SELECT MAX(a.created_at) FROM attempts a
          JOIN segments s ON a.segment_id = s.id
          WHERE s.video_id = videos.id
        )`,
      })
      .from(videos)
      .orderBy(desc(videos.updatedAt))
      .all();

    return NextResponse.json(allVideos);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch videos";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    db.delete(videos).where(eq(videos.id, id)).run();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete video";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
