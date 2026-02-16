"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Segment {
  id: string;
  position: number;
  startTime: number;
  endTime: number;
  japaneseText: string;
  englishRef: string | null;
  hasEnglishRef: boolean;
  bestScore: number | null;
  attemptCount: number;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function SegmentEditorPage() {
  const params = useParams();
  const videoId = params.id as string;

  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editJp, setEditJp] = useState("");
  const [editEn, setEditEn] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSegments();
  }, [videoId]);

  async function fetchSegments() {
    const res = await fetch(`/api/segments?videoId=${videoId}`);
    const data = await res.json();
    setSegments(data);
    setLoading(false);
  }

  async function handleSave(id: string) {
    await fetch("/api/segments", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        japaneseText: editJp,
        englishRef: editEn || null,
      }),
    });
    setEditingId(null);
    fetchSegments();
  }

  async function handleDelete(id: string) {
    await fetch("/api/segments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchSegments();
  }

  async function handleMerge() {
    if (selected.size < 2) return;
    await fetch("/api/segments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "merge",
        segmentIds: Array.from(selected),
      }),
    });
    setSelected(new Set());
    fetchSegments();
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function startEdit(seg: Segment) {
    setEditingId(seg.id);
    setEditJp(seg.japaneseText);
    setEditEn(seg.englishRef || "");
  }

  if (loading) return <div className="text-gray-400">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Segment Editor</h1>
        <div className="flex gap-2">
          {selected.size >= 2 && (
            <button
              onClick={handleMerge}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors"
            >
              Merge Selected ({selected.size})
            </button>
          )}
          <Link
            href={`/video/${videoId}/practice`}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
          >
            Start Practice
          </Link>
        </div>
      </div>

      <div className="text-sm text-gray-400 mb-4">
        {segments.length} segments | Click checkboxes to select for merging
      </div>

      <div className="space-y-2">
        {segments.map((seg) => (
          <div
            key={seg.id}
            className={`bg-gray-900 border rounded-lg p-3 transition-colors ${
              selected.has(seg.id) ? "border-purple-600" : "border-gray-800"
            }`}
          >
            {editingId === seg.id ? (
              <div className="space-y-2">
                <textarea
                  value={editJp}
                  onChange={(e) => setEditJp(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
                  rows={2}
                />
                <textarea
                  value={editEn}
                  onChange={(e) => setEditEn(e.target.value)}
                  placeholder="English reference (optional)"
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-300"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave(seg.id)}
                    className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selected.has(seg.id)}
                  onChange={() => toggleSelect(seg.id)}
                  className="mt-1 accent-purple-600"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <span>#{seg.position + 1}</span>
                    <span>
                      {formatTime(seg.startTime)} - {formatTime(seg.endTime)}
                    </span>
                    {seg.bestScore !== null && (
                      <span
                        className={
                          seg.bestScore >= 7
                            ? "text-green-400"
                            : "text-red-400"
                        }
                      >
                        Best: {seg.bestScore}/10
                      </span>
                    )}
                  </div>
                  <p className="text-white text-sm">{seg.japaneseText}</p>
                  {seg.englishRef && (
                    <p className="text-gray-400 text-xs mt-1">
                      EN: {seg.englishRef}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => startEdit(seg)}
                    className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(seg.id)}
                    className="px-2 py-1 text-xs bg-gray-800 hover:bg-red-900 text-gray-400 hover:text-red-300 rounded transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
