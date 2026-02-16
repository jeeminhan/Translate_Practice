import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const word = req.nextUrl.searchParams.get("word");

  if (!word) {
    return NextResponse.json({ error: "word query param is required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(word)}`
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Jisho API request failed" }, { status: 502 });
    }

    const json = await res.json();

    const results = (json.data || []).slice(0, 5).map((entry: any) => {
      const japanese = entry.japanese?.[0] || {};
      const senses = (entry.senses || []).slice(0, 3);

      return {
        word: japanese.word || japanese.reading || "",
        reading: japanese.reading || "",
        meanings: senses.map((s: any) => ({
          english: (s.english_definitions || []).join(", "),
          partsOfSpeech: (s.parts_of_speech || []).join(", "),
        })),
      };
    });

    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dictionary lookup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
