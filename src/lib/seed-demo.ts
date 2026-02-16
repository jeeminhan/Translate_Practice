/**
 * Seeds the database with a demo video for first-time users.
 * Uses a well-known Japanese learning video with clear speech.
 *
 * Video: "日本語の森" style beginner conversation
 * We use a Comprehensible Japanese video which has clear, slow speech
 * perfect for translation practice.
 */

import { db } from "./db";
import { videos, segments } from "./db/schema";
import { v4 as uuid } from "uuid";
import { eq, sql } from "drizzle-orm";

const DEMO_VIDEO_TITLE = "[Demo] Japanese Home Appliances";
// Yuyu's Japanese Podcast - excellent for intermediate/advanced beginners
const DEMO_VIDEO_URL = "https://www.youtube.com/watch?v=mQA6YMxkWXc";

const DEMO_SEGMENTS = [
  {
    startTime: 9.5,
    endTime: 15.0,
    japaneseText: "はい、皆さんこんにちは。お久しぶりです。ゆうゆうの日本語ポッドキャスト。",
    englishRef: "Hi everyone, hello. It's been a while. This is Yuyu's Japanese Podcast.",
  },
  {
    startTime: 15.0,
    endTime: 19.3,
    japaneseText: "今回は一人でポッドキャストをやっていきたいと思います。",
    englishRef: "This time, I'm going to be doing the podcast by myself.",
  },
  {
    startTime: 19.3,
    endTime: 24.2,
    japaneseText: "このポッドキャストでは僕のメキシコの生活だったり、",
    englishRef: "In this podcast, I'll be talking about things like my life in Mexico...",
  },
  {
    startTime: 24.2,
    endTime: 31.2,
    japaneseText:
      "メキシコや日本で感じたことをあまり深く考えないで話していけたらなぁと思っています。",
    englishRef:
      "I hope to talk about things I've felt in Mexico and Japan without thinking too deeply.",
  },
  {
    startTime: 31.2,
    endTime: 35.7,
    japaneseText: "ということで第一回は日本の家電について話していきたいなと思います。",
    englishRef: "And so, for the first episode, I'd like to talk about Japanese home appliances.",
  },
];

export async function seedDemo(): Promise<string | null> {
  // Check if demo already exists
  const existing = db
    .select()
    .from(videos)
    .where(eq(videos.title, DEMO_VIDEO_TITLE))
    .all();

  if (existing.length > 0) {
    return existing[0].id;
  }

  const videoId = uuid();
  const now = new Date().toISOString();

  db.insert(videos)
    .values({
      id: videoId,
      title: DEMO_VIDEO_TITLE,
      sourceType: "youtube",
      sourceUrl: DEMO_VIDEO_URL,
      direction: "jp_to_en",
      createdAt: now,
      updatedAt: now,
    })
    .run();

  for (let i = 0; i < DEMO_SEGMENTS.length; i++) {
    const seg = DEMO_SEGMENTS[i];
    db.insert(segments)
      .values({
        id: uuid(),
        videoId,
        position: i,
        startTime: seg.startTime,
        endTime: seg.endTime,
        japaneseText: seg.japaneseText,
        englishRef: seg.englishRef,
        hasEnglishRef: true,
      })
      .run();
  }

  return videoId;
}
