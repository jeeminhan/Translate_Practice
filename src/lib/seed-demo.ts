/**
 * Seeds the database with a demo video for first-time users.
 * Uses a famous Violet Evergarden scene — Violet's emotional final letter.
 * Beautiful, clear Japanese with natural sentence pacing, perfect for translation practice.
 */

import { db } from "./db";
import { videos, segments } from "./db/schema";
import { v4 as uuid } from "uuid";
import { eq } from "drizzle-orm";

const DEMO_VIDEO_TITLE = "[Demo] Violet Evergarden — Violet's Final Letter";
const DEMO_VIDEO_URL = "https://www.youtube.com/watch?v=XnseVYTF8_0";

const DEMO_SEGMENTS = [
  {
    startTime: 1.751,
    endTime: 6.464,
    japaneseText: "たくさんの人の思いが空から降ってきます",
    englishRef: "So many people's feelings are falling from the sky.",
  },
  {
    startTime: 8.341,
    endTime: 10.176,
    japaneseText: "ヴァイオレット",
    englishRef: "Violet.",
  },
  {
    startTime: 15.432,
    endTime: 17.017,
    japaneseText: "少佐",
    englishRef: "Major.",
  },
  {
    startTime: 19.894,
    endTime: 23.231,
    japaneseText: "親愛なる ギルベルト少佐",
    englishRef: "To my beloved Major Gilbert.",
  },
  {
    startTime: 24.649,
    endTime: 28.57,
    japaneseText: "お元気ですか？ お変わりないですか？",
    englishRef: "How are you? Are you doing well?",
  },
  {
    startTime: 29.32,
    endTime: 31.781,
    japaneseText: "今 どこに いらっしゃいますか？",
    englishRef: "Where are you right now?",
  },
  {
    startTime: 33.033,
    endTime: 35.827,
    japaneseText: "困ったことはありませんか？",
    englishRef: "I hope you are not troubled.",
  },
  {
    startTime: 39.08,
    endTime: 47.756,
    japaneseText: "春も夏も秋も冬もいくつも季節が過ぎましたが",
    englishRef: "Spring, summer, autumn, winter — many seasons have passed,",
  },
  {
    startTime: 48.465,
    endTime: 53.011,
    japaneseText: "少佐のいらっしゃる季節だけが 巡ってきません",
    englishRef: "but the season of your return has never come.",
  },
  {
    startTime: 54.345,
    endTime: 57.515,
    japaneseText: "私 最初は分かりませんでした",
    englishRef: "At first, I did not understand.",
  },
  {
    startTime: 58.725,
    endTime: 62.896,
    japaneseText: "少佐のお気持ちが 何１つ 分かりませんでした",
    englishRef: "I did not understand any of your feelings.",
  },
  {
    startTime: 63.688,
    endTime: 74.783,
    japaneseText: "でも 少佐に頂いた この新しい人生の中で少しだけですが 感じることが できるようになったのです",
    englishRef: "But in this new life you gave me, I have started to feel — even if just a little.",
  },
  {
    startTime: 76.409,
    endTime: 81.289,
    japaneseText: "代筆を通して出会った方たちを通して",
    englishRef: "Through my work as a ghostwriter, and through the people I've met.",
  },
  {
    startTime: 86.169,
    endTime: 88.713,
    japaneseText: "私は信じています",
    englishRef: "I believe.",
  },
  {
    startTime: 90.381,
    endTime: 94.135,
    japaneseText: "少佐が どこかで 生きていらっしゃることを",
    englishRef: "That you are alive somewhere, Major.",
  },
  {
    startTime: 95.261,
    endTime: 101.392,
    japaneseText: "だから私も 生きて生きて 生きて",
    englishRef: "So I too will live — live, and keep living.",
  },
  {
    startTime: 102.018,
    endTime: 107.524,
    japaneseText: "その先に何があるか 分からなくてもただ 生きて",
    englishRef: "Even if I don't know what lies ahead, I will simply live.",
  },
  {
    startTime: 110.235,
    endTime: 115.573,
    japaneseText: "そして また会えたら こう伝えたいのです",
    englishRef: "And if we should ever meet again, this is what I would tell you.",
  },
  {
    startTime: 116.449,
    endTime: 132.423,
    japaneseText: "私は今 愛してるも少しは分かるのです",
    englishRef: "I now understand — even a little — what 'I love you' means.",
  },
];

export async function seedDemo(userId: string): Promise<string | null> {
  // Check if demo already exists for THIS user
  const existing = await db
    .select()
    .from(videos)
    .where(eq(videos.userId, userId));

  const demoVideo = existing.find(v => v.title === DEMO_VIDEO_TITLE);
  if (demoVideo) {
    return demoVideo.id;
  }

  const videoId = uuid();

  await db.insert(videos)
    .values({
      id: videoId,
      userId,
      title: DEMO_VIDEO_TITLE,
      sourceType: "youtube",
      sourceUrl: DEMO_VIDEO_URL,
      direction: "jp_to_en",
    });

  const segmentRecords = DEMO_SEGMENTS.map((seg, i) => ({
    id: uuid(),
    videoId,
    position: i,
    startTime: seg.startTime,
    endTime: seg.endTime,
    japaneseText: seg.japaneseText,
    englishRef: seg.englishRef,
    hasEnglishRef: true,
  }));

  if (segmentRecords.length > 0) {
    await db.insert(segments).values(segmentRecords);
  }

  return videoId;
}
