import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vocabulary, segments } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const words = await db
      .select({
        id: vocabulary.id,
        word: vocabulary.word,
        reading: vocabulary.reading,
        meaning: vocabulary.meaning,
        segmentId: vocabulary.segmentId,
        contextSentence: vocabulary.contextSentence,
        familiarity: vocabulary.familiarity,
        createdAt: vocabulary.createdAt,
        updatedAt: vocabulary.updatedAt,
        videoId: segments.videoId,
      })
      .from(vocabulary)
      .leftJoin(segments, eq(vocabulary.segmentId, segments.id))
      .where(eq(vocabulary.userId, user.id))
      .orderBy(desc(vocabulary.createdAt));

    return NextResponse.json(words);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch vocabulary";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { word, reading, meaning, segmentId, contextSentence } = await req.json();

    if (!word || !meaning) {
      return NextResponse.json({ error: "word and meaning are required" }, { status: 400 });
    }

    const id = uuid();

    await db.insert(vocabulary).values({
      id,
      userId: user.id,
      word,
      reading: reading || "",
      meaning,
      segmentId: segmentId || null,
      contextSentence: contextSentence || "",
      familiarity: "new",
    });

    return NextResponse.json({ id, success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add word";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, familiarity } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await db.update(vocabulary)
      .set({
        familiarity,
        updatedAt: new Date(),
      })
      .where(eq(vocabulary.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update word";
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

    await db.delete(vocabulary).where(eq(vocabulary.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete word";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
