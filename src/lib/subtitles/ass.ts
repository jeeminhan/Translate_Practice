import { ParsedSubtitle } from "@/types";

function parseTimestamp(ts: string): number {
  // Format: H:MM:SS.cc (centiseconds)
  const [hours, minutes, rest] = ts.trim().split(":");
  const [seconds, cs] = rest.split(".");
  return (
    parseInt(hours) * 3600 +
    parseInt(minutes) * 60 +
    parseInt(seconds) +
    parseInt(cs) / 100
  );
}

function stripAssTags(text: string): string {
  return (
    text
      // Remove override tags like {\b1}, {\i0}, {\pos(x,y)}, etc.
      .replace(/\{[^}]*\}/g, "")
      // Replace \N and \n with space
      .replace(/\\[Nn]/g, " ")
      .trim()
  );
}

export function parseASS(content: string): ParsedSubtitle[] {
  const subtitles: ParsedSubtitle[] = [];
  const lines = content.replace(/\r\n/g, "\n").split("\n");

  // Find the [Events] section and its Format line
  let inEvents = false;
  let formatFields: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "[Events]") {
      inEvents = true;
      continue;
    }

    if (trimmed.startsWith("[") && trimmed !== "[Events]") {
      inEvents = false;
      continue;
    }

    if (!inEvents) continue;

    if (trimmed.startsWith("Format:")) {
      formatFields = trimmed
        .substring(7)
        .split(",")
        .map((f) => f.trim().toLowerCase());
      continue;
    }

    if (trimmed.startsWith("Dialogue:")) {
      const data = trimmed.substring(9);
      // Split only up to the number of format fields - 1, since Text can contain commas
      const values = data.split(",");
      const textIndex = formatFields.indexOf("text");
      const startIndex = formatFields.indexOf("start");
      const endIndex = formatFields.indexOf("end");

      if (textIndex === -1 || startIndex === -1 || endIndex === -1) continue;

      const startTime = parseTimestamp(values[startIndex].trim());
      const endTime = parseTimestamp(values[endIndex].trim());
      // Text field is everything from its index onward (may contain commas)
      const text = stripAssTags(values.slice(textIndex).join(","));

      if (text) {
        subtitles.push({ startTime, endTime, text });
      }
    }
  }

  // Sort by start time
  subtitles.sort((a, b) => a.startTime - b.startTime);

  return subtitles;
}
