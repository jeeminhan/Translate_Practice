"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Familiarity } from "@/types";

interface VocabEntry {
  id: string;
  word: string;
  reading: string;
  meaning: string;
  segmentId: string | null;
  contextSentence: string;
  familiarity: Familiarity;
  createdAt: string;
  videoId: string | null;
}

const familiarityColors: Record<Familiarity, string> = {
  new: "bg-blue-900 text-blue-300",
  learning: "bg-yellow-900 text-yellow-300",
  known: "bg-green-900 text-green-300",
};

export default function VocabularyPage() {
  const [vocab, setVocab] = useState<VocabEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterFam, setFilterFam] = useState<Familiarity | "all">("all");

  useEffect(() => {
    fetch("/api/vocabulary")
      .then((r) => r.json())
      .then((data) => {
        setVocab(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function updateFamiliarity(id: string, familiarity: Familiarity) {
    await fetch("/api/vocabulary", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, familiarity }),
    });
    setVocab((prev) =>
      prev.map((v) => (v.id === id ? { ...v, familiarity } : v))
    );
  }

  async function deleteWord(id: string) {
    await fetch("/api/vocabulary", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setVocab((prev) => prev.filter((v) => v.id !== id));
  }

  function exportCSV() {
    const csv = [
      "Word,Reading,Meaning,Context,Familiarity",
      ...vocab.map(
        (v) =>
          `"${v.word}","${v.reading}","${v.meaning}","${v.contextSentence}","${v.familiarity}"`
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "translateio-vocabulary.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = vocab.filter((v) => {
    if (filterFam !== "all" && v.familiarity !== filterFam) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        v.word.includes(q) ||
        v.reading.includes(q) ||
        v.meaning.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (loading) return <div className="text-gray-400">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Vocabulary ({vocab.length})</h1>
        {vocab.length > 0 && (
          <button
            onClick={exportCSV}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
          >
            Export CSV
          </button>
        )}
      </div>

      {vocab.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">No vocabulary saved yet</p>
          <p className="text-sm">
            Click words during practice to add them here
          </p>
        </div>
      ) : (
        <>
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search words..."
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <div className="flex gap-1">
              {(["all", "new", "learning", "known"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterFam(f)}
                  className={`px-3 py-2 text-xs rounded-md transition-colors ${
                    filterFam === f
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {filtered.map((v) => (
              <div
                key={v.id}
                className="bg-gray-900 border border-gray-800 rounded-lg p-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg text-white font-medium">
                        {v.word}
                      </span>
                      <span className="text-sm text-gray-400">
                        {v.reading}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-xs rounded ${familiarityColors[v.familiarity]}`}
                      >
                        {v.familiarity}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300">{v.meaning}</p>
                    {v.contextSentence && (
                      <p className="text-xs text-gray-500 mt-1 italic">
                        {v.contextSentence}
                      </p>
                    )}
                    {v.videoId && (
                      <Link
                        href={`/video/${v.videoId}/practice`}
                        className="inline-block mt-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        Go to practice &rarr;
                      </Link>
                    )}
                  </div>
                  <div className="flex gap-1 ml-4">
                    {(["new", "learning", "known"] as Familiarity[]).map(
                      (f) =>
                        f !== v.familiarity && (
                          <button
                            key={f}
                            onClick={() => updateFamiliarity(v.id, f)}
                            className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                          >
                            {f}
                          </button>
                        )
                    )}
                    <button
                      onClick={() => deleteWord(v.id)}
                      className="px-2 py-1 text-xs bg-gray-800 hover:bg-red-900 text-gray-400 hover:text-red-300 rounded transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
