"use client";

import type { ScoreResult } from "@/types";

interface ScoreDisplayProps {
  result: ScoreResult;
  mode: "quick" | "detailed";
}

function scoreColor(score: number): string {
  if (score >= 8) return "text-green-400 border-green-800 bg-green-950";
  if (score >= 5) return "text-yellow-400 border-yellow-800 bg-yellow-950";
  return "text-red-400 border-red-800 bg-red-950";
}

function scoreBadgeColor(score: number): string {
  if (score >= 8) return "bg-green-600";
  if (score >= 5) return "bg-yellow-600";
  return "bg-red-600";
}

export default function ScoreDisplay({ result, mode }: ScoreDisplayProps) {
  return (
    <div className={`border rounded-lg p-4 ${scoreColor(result.score)}`}>
      <div className="flex items-center gap-3 mb-3">
        <span
          className={`${scoreBadgeColor(result.score)} text-white text-lg font-bold px-3 py-1 rounded-md`}
        >
          {result.score}/10
        </span>
        <span className="text-sm">{result.feedback}</span>
      </div>

      {mode === "detailed" && result.dimensions && (
        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
          <div>
            Meaning: <strong>{result.dimensions.meaningAccuracy}/10</strong>
          </div>
          <div>
            Completeness:{" "}
            <strong>{result.dimensions.completeness}/10</strong>
          </div>
          <div>
            Naturalness: <strong>{result.dimensions.naturalness}/10</strong>
          </div>
          <div>
            Nuance: <strong>{result.dimensions.nuance}/10</strong>
          </div>
        </div>
      )}

    </div>
  );
}
