export type VideoSource = "youtube" | "local" | "audio";
export type Direction = "jp_to_en" | "en_to_jp";
export type FeedbackMode = "quick" | "detailed";
export type Familiarity = "new" | "learning" | "known";

export interface Video {
  id: string;
  title: string;
  sourceType: VideoSource;
  sourceUrl: string | null;
  filePath: string | null;
  direction: Direction;
  createdAt: string;
  updatedAt: string;
}

export interface Segment {
  id: string;
  videoId: string;
  position: number;
  startTime: number;
  endTime: number;
  japaneseText: string;
  englishRef: string | null;
  hasEnglishRef: boolean;
}

export interface Attempt {
  id: string;
  segmentId: string;
  userTranslation: string;
  score: number;
  feedbackJson: string;
  feedbackMode: FeedbackMode;
  createdAt: string;
}

export interface Session {
  id: string;
  videoId: string;
  startedAt: string;
  completedAt: string | null;
  segmentsDone: number;
  avgScore: number | null;
}

export interface VocabWord {
  id: string;
  word: string;
  reading: string;
  meaning: string;
  segmentId: string | null;
  contextSentence: string;
  familiarity: Familiarity;
  createdAt: string;
  updatedAt: string;
}

export interface ParsedSubtitle {
  startTime: number;
  endTime: number;
  text: string;
}

export interface ScoreResult {
  score: number;
  feedback: string;
  referenceSample: string;
  dimensions?: {
    meaningAccuracy: number;
    completeness: number;
    naturalness: number;
    nuance: number;
  };
}
