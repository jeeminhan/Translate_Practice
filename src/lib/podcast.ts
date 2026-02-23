import { GoogleAIFileManager } from "@google/generative-ai/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import https from "https";
import http from "http";
import fs from "fs";
import fsPromises from "fs/promises";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";

interface TranscriptSegment {
  startTime: number;
  endTime: number;
  japaneseText: string;
}

interface PodcastSegment {
  startTime: number;
  endTime: number;
  japaneseText: string;
  englishRef: string | null;
}

interface PodcastTranscriptResult {
  title: string;
  segments: PodcastSegment[];
}

function getMimeType(url: string): string {
  if (url.includes(".mp3")) return "audio/mpeg";
  if (url.includes(".m4a") || url.includes(".mp4")) return "audio/mp4";
  if (url.includes(".webm")) return "audio/webm";
  if (url.includes(".ogg")) return "audio/ogg";
  return "audio/mpeg"; // default
}

function extractExtension(url: string): string {
  const cleanUrl = url.split("?")[0];
  const lastSegment = cleanUrl.split("/").pop() || "";
  const dotIndex = lastSegment.lastIndexOf(".");
  if (dotIndex !== -1) {
    return lastSegment.slice(dotIndex + 1);
  }
  return "mp3";
}

function extractTitle(url: string): string {
  const cleanUrl = url.split("?")[0];
  const lastSegment = cleanUrl.split("/").pop() || "podcast";
  const dotIndex = lastSegment.lastIndexOf(".");
  if (dotIndex !== -1) {
    return lastSegment.slice(0, dotIndex);
  }
  return lastSegment || "podcast";
}

function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    const file = fs.createWriteStream(destPath, { flags: "w" });

    const request = protocol.get(url, (response) => {
      if (
        response.statusCode &&
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        file.close();
        fs.unlink(destPath, () => {
          downloadFile(response.headers.location!, destPath)
            .then(resolve)
            .catch(reject);
        });
        return;
      }

      if (response.statusCode && response.statusCode !== 200) {
        file.close();
        reject(new Error(`HTTP ${response.statusCode} downloading audio file`));
        return;
      }

      response.pipe(file);

      file.on("finish", () => {
        file.close(() => resolve());
      });

      file.on("error", (err) => {
        file.close();
        reject(err);
      });
    });

    request.on("error", (err) => {
      file.close();
      reject(err);
    });
  });
}

export async function transcribePodcastAudio(
  audioUrl: string,
  apiKey: string
): Promise<PodcastTranscriptResult> {
  const title = extractTitle(audioUrl);
  const ext = extractExtension(audioUrl);
  const mimeType = getMimeType(audioUrl);

  const tmpDir = path.join(os.tmpdir(), "translateio");
  await fsPromises.mkdir(tmpDir, { recursive: true });

  const localFilePath = path.join(tmpDir, `${randomUUID()}.${ext}`);

  let uploadedFileUri: string | null = null;
  let uploadedFileName: string | null = null;

  try {
    // Step 1: Download the audio file
    await downloadFile(audioUrl, localFilePath);

    const stat = await fsPromises.stat(localFilePath);
    if (stat.size === 0) {
      throw new Error("Audio file could not be downloaded");
    }

    // Step 2: Upload to Gemini Files API
    const fileManager = new GoogleAIFileManager(apiKey);
    const uploadResult = await fileManager.uploadFile(localFilePath, {
      mimeType,
      displayName: "podcast-audio",
    });

    uploadedFileUri = uploadResult.file.uri;
    uploadedFileName = uploadResult.file.name;

    // Step 3: Transcribe with Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const transcriptionPrompt = `You will receive a Japanese audio file. Transcribe it into segments for language learning practice.
Return ONLY a valid JSON array (no markdown, no code blocks):
[
  { "startTime": 0, "endTime": 8.5, "text": "Japanese sentence here" },
  ...
]
Group sentences into natural chunks of 5-15 seconds each.
If you cannot determine exact timestamps, estimate them based on speaking pace.`;

    const transcriptResult = await model.generateContent([
      { fileData: { mimeType, fileUri: uploadedFileUri } },
      { text: transcriptionPrompt },
    ]);

    let transcriptText = transcriptResult.response.text().trim();
    // Strip markdown code blocks if present
    transcriptText = transcriptText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    // Step 4: Parse transcript JSON
    let rawSegments: { startTime: number; endTime: number; text: string }[];
    try {
      rawSegments = JSON.parse(transcriptText);
    } catch {
      throw new Error("Gemini returned invalid transcript JSON");
    }

    const transcriptSegments: TranscriptSegment[] = rawSegments.map((s) => ({
      startTime: s.startTime,
      endTime: s.endTime,
      japaneseText: s.text,
    }));

    // Step 5: Translate each segment to English (batched to avoid rate limits)
    const TRANSLATION_BATCH_SIZE = 5;
    const segments: PodcastSegment[] = [];
    for (let i = 0; i < transcriptSegments.length; i += TRANSLATION_BATCH_SIZE) {
      const batch = transcriptSegments.slice(i, i + TRANSLATION_BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (seg) => {
          try {
            const translationPrompt = `Translate this Japanese sentence to natural English. Return only the translation, nothing else.
Japanese: ${seg.japaneseText}`;
            const translationResult = await model.generateContent(translationPrompt);
            const englishRef = translationResult.response.text().trim() || null;
            return {
              startTime: seg.startTime,
              endTime: seg.endTime,
              japaneseText: seg.japaneseText,
              englishRef,
            };
          } catch {
            return {
              startTime: seg.startTime,
              endTime: seg.endTime,
              japaneseText: seg.japaneseText,
              englishRef: null,
            };
          }
        })
      );
      segments.push(...batchResults);
    }

    return { title, segments };
  } finally {
    // Step 6: Clean up — delete uploaded Gemini file and local temp file
    if (uploadedFileName) {
      const fileManager = new GoogleAIFileManager(apiKey);
      await fileManager.deleteFile(uploadedFileName).catch(() => {});
    }
    await fsPromises.unlink(localFilePath).catch(() => {});
  }
}
