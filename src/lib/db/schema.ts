import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const videos = sqliteTable("videos", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  sourceType: text("source_type").notNull(), // "youtube" | "local"
  sourceUrl: text("source_url"),
  filePath: text("file_path"),
  direction: text("direction").notNull().default("jp_to_en"), // "jp_to_en" | "en_to_jp"
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const segments = sqliteTable("segments", {
  id: text("id").primaryKey(),
  videoId: text("video_id")
    .notNull()
    .references(() => videos.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  startTime: real("start_time").notNull(),
  endTime: real("end_time").notNull(),
  japaneseText: text("japanese_text").notNull(),
  englishRef: text("english_ref"),
  hasEnglishRef: integer("has_english_ref", { mode: "boolean" })
    .notNull()
    .default(false),
});

export const attempts = sqliteTable("attempts", {
  id: text("id").primaryKey(),
  segmentId: text("segment_id")
    .notNull()
    .references(() => segments.id, { onDelete: "cascade" }),
  userTranslation: text("user_translation").notNull(),
  score: integer("score").notNull(),
  feedbackJson: text("feedback_json").notNull(),
  feedbackMode: text("feedback_mode").notNull(), // "quick" | "detailed"
  createdAt: text("created_at").notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  videoId: text("video_id")
    .notNull()
    .references(() => videos.id, { onDelete: "cascade" }),
  startedAt: text("started_at").notNull(),
  completedAt: text("completed_at"),
  segmentsDone: integer("segments_done").notNull().default(0),
  avgScore: real("avg_score"),
});

export const vocabulary = sqliteTable("vocabulary", {
  id: text("id").primaryKey(),
  word: text("word").notNull(),
  reading: text("reading").notNull(),
  meaning: text("meaning").notNull(),
  segmentId: text("segment_id").references(() => segments.id, {
    onDelete: "set null",
  }),
  contextSentence: text("context_sentence").notNull(),
  familiarity: text("familiarity").notNull().default("new"), // "new" | "learning" | "known"
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
