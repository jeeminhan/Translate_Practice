"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface SegmentReview {
  id: string;
  position: number;
  startTime: number;
  endTime: number;
  japaneseText: string;
  englishRef: string | null;
  bestScore: number | null;
  attemptCount: number;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function scoreBg(score: number | null): string {
  if (score === null) return "bg-gray-900 border-gray-800";
  if (score >= 8) return "bg-green-950 border-green-800";
  if (score >= 5) return "bg-yellow-950 border-yellow-800";
  return "bg-red-950 border-red-800";
}

function scoreText(score: number | null): string {
  if (score === null) return "text-gray-500";
  if (score >= 8) return "text-green-400";
  if (score >= 5) return "text-yellow-400";
  return "text-red-400";
}

type Filter = "all" | "passed" | "needs-work" | "unattempted";

export default function ReviewPage() {
  const params = useParams();
  const videoId = params.id as string;

  const [segments, setSegments] = useState<SegmentReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    fetch(`/api/segments?videoId=${videoId}`)
      .then((r) => r.json())
      .then((data) => {
        setSegments(data);
        setLoading(false);
      });
  }, [videoId]);

  const filtered = segments.filter((seg) => {
    switch (filter) {
      case "passed":
        return seg.bestScore !== null && seg.bestScore >= 7;
      case "needs-work":
        return seg.bestScore !== null && seg.bestScore < 7;
      case "unattempted":
        return seg.bestScore === null;
      default:
        return true;
    }
  });

  const passedCount = segments.filter(
    (s) => s.bestScore !== null && s.bestScore >= 7
  ).length;
  const failedCount = segments.filter(
    (s) => s.bestScore !== null && s.bestScore < 7
  ).length;
  const unattemptedCount = segments.filter(
    (s) => s.bestScore === null
  ).length;
  const avgScore =
    segments.filter((s) => s.bestScore !== null).length > 0
      ? segments
          .filter((s) => s.bestScore !== null)
          .reduce((sum, s) => sum + s.bestScore!, 0) /
        segments.filter((s) => s.bestScore !== null).length
      : null;

  if (loading) return <div className="text-gray-400">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Review</h1>
        <Link
          href={`/video/${videoId}/practice`}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
        >
          Practice Again
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-white">
            {avgScore !== null ? avgScore.toFixed(1) : "—"}
          </div>
          <div className="text-xs text-gray-400">Avg Score</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{passedCount}</div>
          <div className="text-xs text-gray-400">Passed</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-400">{failedCount}</div>
          <div className="text-xs text-gray-400">Needs Work</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-500">
            {unattemptedCount}
          </div>
          <div className="text-xs text-gray-400">Not Attempted</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {(["all", "passed", "needs-work", "unattempted"] as Filter[]).map(
          (f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {f === "all"
                ? `All (${segments.length})`
                : f === "passed"
                  ? `Passed (${passedCount})`
                  : f === "needs-work"
                    ? `Needs Work (${failedCount})`
                    : `Unattempted (${unattemptedCount})`}
            </button>
          )
        )}
      </div>

      {/* Segments */}
      <div className="space-y-2">
        {filtered.map((seg) => (
          <div
            key={seg.id}
            className={`border rounded-lg p-3 ${scoreBg(seg.bestScore)}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <span>#{seg.position + 1}</span>
                  <span>
                    {formatTime(seg.startTime)} - {formatTime(seg.endTime)}
                  </span>
                  <span>{seg.attemptCount} attempts</span>
                </div>
                <p className="text-white text-sm">{seg.japaneseText}</p>
                {seg.englishRef && (
                  <p className="text-gray-400 text-xs mt-1">
                    Ref: {seg.englishRef}
                  </p>
                )}
              </div>
              <div className={`text-2xl font-bold ${scoreText(seg.bestScore)}`}>
                {seg.bestScore !== null ? `${seg.bestScore}` : "—"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
