import {
  pgTable,
  text,
  integer,
  timestamp,
  doublePrecision,
  boolean,
} from "drizzle-orm/pg-core";

export const videos = pgTable("videos", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  title: text("title").notNull(),
  sourceType: text("source_type").notNull(),
  sourceUrl: text("source_url"),
  filePath: text("file_path"),
  direction: text("direction").notNull().default("jp_to_en"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const segments = pgTable("segments", {
  id: text("id").primaryKey(),
  videoId: text("video_id")
    .notNull()
    .references(() => videos.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  startTime: doublePrecision("start_time").notNull(),
  endTime: doublePrecision("end_time").notNull(),
  japaneseText: text("japanese_text").notNull(),
  englishRef: text("english_ref"),
  hasEnglishRef: boolean("has_english_ref").notNull().default(false),
});

export const attempts = pgTable("attempts", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  segmentId: text("segment_id")
    .notNull()
    .references(() => segments.id, { onDelete: "cascade" }),
  userTranslation: text("user_translation").notNull(),
  score: integer("score").notNull(),
  feedbackJson: text("feedback_json").notNull(),
  feedbackMode: text("feedback_mode").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  videoId: text("video_id")
    .notNull()
    .references(() => videos.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  segmentsDone: integer("segments_done").notNull().default(0),
  avgScore: doublePrecision("avg_score"),
});

export const vocabulary = pgTable("vocabulary", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  word: text("word").notNull(),
  reading: text("reading").notNull(),
  meaning: text("meaning").notNull(),
  segmentId: text("segment_id").references(() => segments.id, {
    onDelete: "set null",
  }),
  contextSentence: text("context_sentence").notNull(),
  familiarity: text("familiarity").notNull().default("new"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
