"use client";

import { useEffect, useState, useRef } from "react";

interface Meaning {
  english: string;
  partsOfSpeech: string;
}

interface DictResult {
  word: string;
  reading: string;
  meanings: Meaning[];
}

interface WordPopupProps {
  word: string;
  segmentId: string;
  contextSentence: string;
  anchorRect: DOMRect;
  onClose: () => void;
}

export default function WordPopup({
  word,
  segmentId,
  contextSentence,
  anchorRect,
  onClose,
}: WordPopupProps) {
  const [results, setResults] = useState<DictResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/dictionary?word=${encodeURIComponent(word)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setResults(data.results || []);
        }
      })
      .catch(() => setError("Failed to look up word"))
      .finally(() => setLoading(false));
  }, [word]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleSave = async (result: DictResult) => {
    setSaving(true);
    try {
      const res = await fetch("/api/vocabulary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: result.word,
          reading: result.reading,
          meaning: result.meanings.map((m) => m.english).join("; "),
          segmentId,
          contextSentence,
        }),
      });
      if (res.ok) {
        setSaved(true);
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  // Position popup below the clicked word
  const top = anchorRect.bottom + window.scrollY + 8;
  const left = Math.max(8, anchorRect.left + window.scrollX - 100);

  return (
    <div
      ref={popupRef}
      className="fixed z-50 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl"
      style={{
        top: `${anchorRect.bottom + 8}px`,
        left: `${Math.min(Math.max(8, anchorRect.left - 100), window.innerWidth - 340)}px`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-800">
        <span className="text-lg text-white font-medium">{word}</span>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-300 text-lg leading-none"
        >
          &times;
        </button>
      </div>

      {/* Body */}
      <div className="p-3 max-h-64 overflow-y-auto">
        {loading && <p className="text-gray-400 text-sm">Looking up...</p>}
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {!loading && !error && results.length === 0 && (
          <p className="text-gray-500 text-sm">No results found.</p>
        )}
        {results.map((result, i) => (
          <div key={i} className={`${i > 0 ? "mt-3 pt-3 border-t border-gray-800" : ""}`}>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-white font-medium">{result.word}</span>
              {result.reading && result.reading !== result.word && (
                <span className="text-blue-400 text-sm">{result.reading}</span>
              )}
            </div>
            {result.meanings.map((m, j) => (
              <div key={j} className="ml-2 mb-1">
                {m.partsOfSpeech && (
                  <span className="text-xs text-gray-500 italic">{m.partsOfSpeech} </span>
                )}
                <span className="text-gray-300 text-sm">{m.english}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Save button */}
      {results.length > 0 && (
        <div className="p-3 border-t border-gray-800">
          <button
            onClick={() => handleSave(results[0])}
            disabled={saving || saved}
            className={`w-full px-3 py-2 text-sm rounded-md font-medium transition-colors ${
              saved
                ? "bg-green-900 text-green-300 cursor-default"
                : "bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-700"
            }`}
          >
            {saved ? "Saved to Vocab" : saving ? "Saving..." : "Save to Vocab"}
          </button>
        </div>
      )}
    </div>
  );
}
