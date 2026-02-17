import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { videos, segments, attempts } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allVideos = await db
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
      .where(eq(videos.userId, user.id))
      .orderBy(desc(videos.updatedAt));

    return NextResponse.json(allVideos);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch videos";
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

    // Ensure the video belongs to the user
    const videoResult = await db.select().from(videos).where(eq(videos.id, id));
    const video = videoResult[0];

    if (!video || video.userId !== user.id) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Delete attempts for all segments of this video
    const videoSegments = await db.select({ id: segments.id }).from(segments).where(eq(segments.videoId, id));
    for (const seg of videoSegments) {
      await db.delete(attempts).where(eq(attempts.segmentId, seg.id));
    }
    // Delete segments, then the video
    await db.delete(segments).where(eq(segments.videoId, id));
    await db.delete(videos).where(eq(videos.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete video";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
