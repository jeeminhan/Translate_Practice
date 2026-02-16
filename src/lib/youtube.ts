import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import { parseSRT } from "./subtitles/srt";
import type { ParsedSubtitle } from "@/types";

const execAsync = promisify(exec);

interface YouTubeResult {
  title: string;
  videoId: string;
  japaneseSegments: ParsedSubtitle[];
  englishSegments: ParsedSubtitle[];
  hasEnglishSubs: boolean;
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

async function runYtDlp(args: string, timeout = 60000): Promise<string> {
  try {
    const { stdout, stderr } = await execAsync(`yt-dlp ${args}`, { timeout });
    // Log warnings but don't fail on them
    if (stderr) {
      console.warn("yt-dlp warnings:", stderr);
    }
    return stdout;
  } catch (error: unknown) {
    const err = error as { stderr?: string; message?: string };
    const stderr = err.stderr || "";
    // If it's just a warning about EN subs failing, that's OK
    if (stderr.includes("429") && stderr.includes("en")) {
      console.warn("YouTube rate-limited English subs, continuing without them");
      return "";
    }
    throw new Error(
      `yt-dlp failed: ${stderr || err.message || "Unknown error"}`
    );
  }
}

export async function extractSubtitles(url: string): Promise<YouTubeResult> {
  const videoId = extractVideoId(url);
  if (!videoId) throw new Error("Invalid YouTube URL");

  const tmpDir = path.join(process.cwd(), "data", "tmp", videoId);
  await fs.mkdir(tmpDir, { recursive: true });

  try {
    // Get video title
    const titleOut = await runYtDlp(`--get-title "${url}"`, 30000);
    const title = titleOut.trim() || `Video ${videoId}`;

    // Try downloading Japanese subs first (priority)
    // Use --no-warnings to reduce noise, and handle each language separately
    // to avoid failing entirely when one language has a 429
    try {
      await runYtDlp(
        `--write-sub --write-auto-sub --sub-lang "ja" --sub-format srt --skip-download --no-warnings -o "${tmpDir}/%(id)s" "${url}"`,
        60000
      );
    } catch (e) {
      console.warn("Failed to download JP subs:", e);
    }

    // Try English subs separately (optional, may 429)
    try {
      await runYtDlp(
        `--write-sub --write-auto-sub --sub-lang "en" --sub-format srt --skip-download --no-warnings -o "${tmpDir}/%(id)s" "${url}"`,
        60000
      );
    } catch {
      console.warn("English subs not available or rate-limited, continuing without them");
    }

    // List all files in tmp dir for debugging
    const files = await fs.readdir(tmpDir);
    console.log("Downloaded subtitle files:", files);

    // Read Japanese subtitles - check multiple possible filenames
    let japaneseSegments: ParsedSubtitle[] = [];
    const jpPaths = [
      path.join(tmpDir, `${videoId}.ja.srt`),
      path.join(tmpDir, `${videoId}.ja-orig.srt`),
    ];
    // Also check for any .ja. file
    for (const file of files) {
      if (file.includes(".ja") && file.endsWith(".srt")) {
        jpPaths.unshift(path.join(tmpDir, file));
      }
    }
    for (const p of jpPaths) {
      try {
        const content = await fs.readFile(p, "utf-8");
        japaneseSegments = parseSRT(content);
        if (japaneseSegments.length > 0) break;
      } catch {
        continue;
      }
    }

    if (japaneseSegments.length === 0) {
      throw new Error(
        "No Japanese subtitles found for this video. Make sure the video has Japanese subtitles (manual or auto-generated)."
      );
    }

    // Read English subtitles (optional)
    let englishSegments: ParsedSubtitle[] = [];
    const enPaths = [
      path.join(tmpDir, `${videoId}.en.srt`),
      path.join(tmpDir, `${videoId}.en-orig.srt`),
    ];
    for (const file of files) {
      if (file.includes(".en") && file.endsWith(".srt")) {
        enPaths.unshift(path.join(tmpDir, file));
      }
    }
    for (const p of enPaths) {
      try {
        const content = await fs.readFile(p, "utf-8");
        englishSegments = parseSRT(content);
        if (englishSegments.length > 0) break;
      } catch {
        continue;
      }
    }

    return {
      title,
      videoId,
      japaneseSegments,
      englishSegments,
      hasEnglishSubs: englishSegments.length > 0,
    };
  } finally {
    // Clean up temp files
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
