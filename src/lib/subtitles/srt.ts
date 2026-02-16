import { ParsedSubtitle } from "@/types";

function parseTimestamp(ts: string): number {
  // Format: HH:MM:SS,mmm
  const [time, ms] = ts.trim().split(",");
  const [hours, minutes, seconds] = time.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds + parseInt(ms) / 1000;
}

export function parseSRT(content: string): ParsedSubtitle[] {
  const subtitles: ParsedSubtitle[] = [];
  const blocks = content.trim().replace(/\r\n/g, "\n").split("\n\n");

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length < 3) continue;

    // Line 0: index number (skip)
    // Line 1: timestamps
    const timeLine = lines[1];
    const timeMatch = timeLine.match(
      /(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/
    );
    if (!timeMatch) continue;

    const startTime = parseTimestamp(timeMatch[1]);
    const endTime = parseTimestamp(timeMatch[2]);

    // Lines 2+: subtitle text
    const text = lines
      .slice(2)
      .join(" ")
      .replace(/<[^>]+>/g, "") // Strip HTML tags
      .trim();

    if (text) {
      subtitles.push({ startTime, endTime, text });
    }
  }

  return subtitles;
}
