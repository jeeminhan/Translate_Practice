"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import SpeechRecorder from "@/components/SpeechRecorder";
import ScoreDisplay from "@/components/ScoreDisplay";
import VideoPlayer from "@/components/VideoPlayer";
import ClickableJapanese from "@/components/ClickableJapanese";
import type { ScoreResult, FeedbackMode } from "@/types";

interface SegmentWithScore {
  id: string;
  position: number;
  startTime: number;
  endTime: number;
  japaneseText: string;
  englishRef: string | null;
  hasEnglishRef: boolean;
  bestScore: number | null;
  attemptCount: number;
  lastTranslation: string | null;
  lastFeedbackJson: string | null;
}

type SegmentStatus = "unattempted" | "passed" | "failed" | "reviewed";

function getStatus(seg: SegmentWithScore): SegmentStatus {
  if (seg.bestScore === null) return "unattempted";
  if (seg.bestScore >= 7) return "passed";
  return "failed";
}

function statusIcon(status: SegmentStatus): string {
  switch (status) {
    case "passed":
      return "\u2713";
    case "failed":
      return "\u2717";
    case "reviewed":
      return "\u25C9";
    default:
      return "\u25CB";
  }
}

function statusColor(status: SegmentStatus): string {
  switch (status) {
    case "passed":
      return "text-green-400";
    case "failed":
      return "text-red-400";
    case "reviewed":
      return "text-orange-400";
    default:
      return "text-gray-500";
  }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function PracticePage() {
  const params = useParams();
  const videoId = params.id as string;

  const [segments, setSegments] = useState<SegmentWithScore[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [videoUrl, setVideoUrl] = useState("");

  const [replayKey, setReplayKey] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [scoring, setScoring] = useState(false);
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [feedbackMode, setFeedbackMode] = useState<FeedbackMode>("quick");
  const [showAnswer, setShowAnswer] = useState(false);
  const [fixUpMode, setFixUpMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState("");

  // Persist transcripts and scores across segment navigation
  const [savedTranscripts, setSavedTranscripts] = useState<Record<string, string>>({});
  const [savedScores, setSavedScores] = useState<Record<string, ScoreResult>>({});

  const [localStatuses, setLocalStatuses] = useState<
    Record<string, SegmentStatus>
  >({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch video info
    fetch(`/api/videos`)
      .then((r) => r.json())
      .then((videos) => {
        const video = videos.find(
          (v: { id: string }) => v.id === videoId
        );
        if (video?.sourceUrl) {
          setVideoUrl(video.sourceUrl);
        }
      });

    // Fetch segments
    fetch(`/api/segments?videoId=${videoId}`)
      .then((r) => r.json())
      .then((data) => {
        setSegments(data);
        // Init statuses
        const statuses: Record<string, SegmentStatus> = {};
        const transcripts: Record<string, string> = {};
        const scores: Record<string, ScoreResult> = {};
        for (const seg of data) {
          statuses[seg.id] = getStatus(seg);
          if (seg.lastTranslation) {
            transcripts[seg.id] = seg.lastTranslation;
          }
          if (seg.lastFeedbackJson) {
            try {
              scores[seg.id] = JSON.parse(seg.lastFeedbackJson);
            } catch { /* ignore parse errors */ }
          }
        }
        setLocalStatuses(statuses);
        setSavedTranscripts(transcripts);
        setSavedScores(scores);

        // Restore state for the first segment
        if (data.length > 0) {
          const first = data[0];
          if (transcripts[first.id]) setTranscript(transcripts[first.id]);
          if (scores[first.id]) setScoreResult(scores[first.id]);
        }
      });
  }, [videoId]);

  const currentSeg = segments[currentIndex];
  const displaySegments = fixUpMode
    ? segments.filter((s) => localStatuses[s.id] === "failed")
    : segments;

  const passedCount = Object.values(localStatuses).filter(
    (s) => s === "passed"
  ).length;
  const failedCount = Object.values(localStatuses).filter(
    (s) => s === "failed"
  ).length;
  const attemptedCount = passedCount + failedCount;

  const goToSegment = useCallback(
    (index: number) => {
      // Save current segment's state before leaving
      if (currentSeg) {
        if (transcript) {
          setSavedTranscripts((prev) => ({ ...prev, [currentSeg.id]: transcript }));
        }
        if (scoreResult) {
          setSavedScores((prev) => ({ ...prev, [currentSeg.id]: scoreResult }));
        }
      }

      // Switch to new segment
      setCurrentIndex(index);
      setShowAnswer(false);
      setPlaying(false);
      setIsEditing(false);
      setError(null);

      // Restore saved state for target segment
      const targetSeg = segments[index];
      if (targetSeg) {
        setTranscript(savedTranscripts[targetSeg.id] || "");
        setScoreResult(savedScores[targetSeg.id] || null);
      } else {
        setTranscript("");
        setScoreResult(null);
      }
    },
    [currentSeg, transcript, scoreResult, segments, savedTranscripts, savedScores]
  );

  const handleSaveText = useCallback(async () => {
    if (!currentSeg) return;
    try {
      const res = await fetch("/api/segments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: currentSeg.id,
          japaneseText: editedText,
        }),
      });
      if (res.ok) {
        setSegments((prev) =>
          prev.map((s) =>
            s.id === currentSeg.id ? { ...s, japaneseText: editedText } : s
          )
        );
        setIsEditing(false);
      }
    } catch (err) {
      console.error("Failed to save segment text:", err);
    }
  }, [currentSeg, editedText]);

  const handleTranscript = useCallback((text: string) => {
    setTranscript(text);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!transcript || !currentSeg) return;
    setScoring(true);

    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          japaneseText: currentSeg.japaneseText,
          userTranslation: transcript,
          segmentId: currentSeg.id,
          mode: feedbackMode,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to get score");
      }

      setScoreResult(result);
      setSavedScores((prev) => ({ ...prev, [currentSeg.id]: result }));
      setSavedTranscripts((prev) => ({ ...prev, [currentSeg.id]: transcript }));
      setError(null);

      // Update local status
      const newStatus: SegmentStatus = result.score >= 7 ? "passed" : "failed";
      setLocalStatuses((prev) => ({
        ...prev,
        [currentSeg.id]: newStatus,
      }));

      // Update segment's best score locally
      setSegments((prev) =>
        prev.map((s) =>
          s.id === currentSeg.id
            ? {
              ...s,
              bestScore:
                s.bestScore === null
                  ? result.score
                  : Math.max(s.bestScore, result.score),
              attemptCount: s.attemptCount + 1,
            }
            : s
        )
      );
    } catch (err) {
      console.error("Scoring failed:", err);
      setError(err instanceof Error ? err.message : "Scoring failed");
    } finally {
      setScoring(false);
    }
  }, [transcript, currentSeg, feedbackMode]);

  const handleNext = useCallback(() => {
    if (currentIndex < segments.length - 1) {
      goToSegment(currentIndex + 1);
    }
  }, [currentIndex, segments.length, goToSegment]);

  const handleVideoEnded = useCallback(() => {
    setPlaying(false);
  }, []);

  const handleRetry = useCallback(() => {
    setTranscript("");
    setScoreResult(null);
    setShowAnswer(false);
    if (currentSeg) {
      setSavedTranscripts((prev) => {
        const next = { ...prev };
        delete next[currentSeg.id];
        return next;
      });
      setSavedScores((prev) => {
        const next = { ...prev };
        delete next[currentSeg.id];
        return next;
      });
    }
  }, [currentSeg]);

  if (segments.length === 0) {
    return <div className="text-gray-400">Loading segments...</div>;
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)]">
      {error && (
        <div className="fixed top-20 right-4 bg-red-900 border border-red-700 text-red-100 px-4 py-2 rounded-lg shadow-xl z-50 flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <span className="text-xl">⚠️</span>
          <div className="flex-1">
            <p className="text-sm font-semibold">Error</p>
            <p className="text-xs opacity-80">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="hover:text-white">&times;</button>
        </div>
      )}
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 bg-gray-900 border border-gray-800 rounded-lg overflow-hidden flex flex-col">
        <div className="p-3 border-b border-gray-800">
          <div className="text-xs text-gray-400 mb-2">
            {attemptedCount}/{segments.length} done | {passedCount} passed |{" "}
            {failedCount} need work
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden flex">
            <div
              className="bg-green-600 h-full"
              style={{
                width: `${(passedCount / segments.length) * 100}%`,
              }}
            />
            <div
              className="bg-red-600 h-full"
              style={{
                width: `${(failedCount / segments.length) * 100}%`,
              }}
            />
          </div>
          <button
            onClick={() => setFixUpMode(!fixUpMode)}
            className={`mt-2 w-full px-2 py-1 text-xs rounded transition-colors ${fixUpMode
              ? "bg-red-900 text-red-300"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
          >
            {fixUpMode ? "Show All" : "Fix Up Mode"}
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          {displaySegments.map((seg) => {
            const realIndex = segments.indexOf(seg);
            const status = localStatuses[seg.id] || "unattempted";
            return (
              <button
                key={seg.id}
                onClick={() => goToSegment(realIndex)}
                className={`w-full text-left px-3 py-2 text-xs border-b border-gray-800/50 hover:bg-gray-800 transition-colors ${realIndex === currentIndex ? "bg-gray-800" : ""
                  }`}
              >
                <span className={`${statusColor(status)} mr-2 font-mono`}>
                  {statusIcon(status)}
                </span>
                <span className="text-gray-500 mr-1">{seg.position + 1}.</span>
                <span className="text-gray-300 truncate">
                  {seg.japaneseText.slice(0, 30)}
                  {seg.japaneseText.length > 30 ? "..." : ""}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
        {/* Video player */}
        {videoUrl && (
          <VideoPlayer
            url={videoUrl}
            startTime={currentSeg.startTime}
            endTime={currentSeg.endTime}
            playing={playing}
            playbackRate={playbackRate}
            seekTrigger={replayKey}
            onEnded={handleVideoEnded}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
        )}

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPlaying(!playing)}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-md text-sm transition-colors"
          >
            {playing ? "Pause" : "Play"}
          </button>
          <button
            onClick={() => {
              // Toggle playing off/on with a small delay to trigger seek
              setPlaying(false);
              setReplayKey((k) => k + 1);
              setTimeout(() => setPlaying(true), 50);
            }}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-md text-sm transition-colors"
          >
            Replay
          </button>
          <div className="flex items-center gap-1 ml-4">
            <span className="text-xs text-gray-500">Speed:</span>
            {[0.5, 0.75, 1, 1.25].map((rate) => (
              <button
                key={rate}
                onClick={() => setPlaybackRate(rate)}
                className={`px-2 py-1 text-xs rounded transition-colors ${playbackRate === rate
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
              >
                {rate}x
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1">
            <span className="text-xs text-gray-500">Feedback:</span>
            <button
              onClick={() => setFeedbackMode("quick")}
              className={`px-2 py-1 text-xs rounded transition-colors ${feedbackMode === "quick"
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400"
                }`}
            >
              Quick
            </button>
            <button
              onClick={() => setFeedbackMode("detailed")}
              className={`px-2 py-1 text-xs rounded transition-colors ${feedbackMode === "detailed"
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400"
                }`}
            >
              Detailed
            </button>
          </div>
        </div>

        {/* Japanese text */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">
              Segment {currentSeg.position + 1} of {segments.length} |{" "}
              {formatTime(currentSeg.startTime)} -{" "}
              {formatTime(currentSeg.endTime)}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (isEditing) {
                    setIsEditing(false);
                  } else {
                    setEditedText(currentSeg.japaneseText);
                    setIsEditing(true);
                  }
                }}
                className={`px-2 py-1 text-xs rounded transition-colors ${isEditing
                  ? "bg-red-900/50 text-red-300 hover:bg-red-900/70"
                  : "bg-gray-800 hover:bg-gray-700 text-gray-400"
                  }`}
              >
                {isEditing ? "Cancel" : "Edit Text"}
              </button>
              <button
                onClick={() =>
                  currentIndex > 0 && goToSegment(currentIndex - 1)
                }
                disabled={currentIndex === 0}
                className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-30 rounded transition-colors"
              >
                Prev
              </button>
              <button
                onClick={handleNext}
                disabled={currentIndex >= segments.length - 1}
                className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-30 rounded transition-colors"
              >
                Next
              </button>
            </div>
          </div>
          {isEditing ? (
            <div className="space-y-3">
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[120px] text-lg leading-relaxed"
                placeholder="Edit Japanese text..."
                autoFocus
              />
              <div className="flex justify-end">
                <button
                  onClick={handleSaveText}
                  disabled={!editedText.trim() || editedText === currentSeg.japaneseText}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-md text-sm font-medium transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <ClickableJapanese
              text={currentSeg.japaneseText}
              segmentId={currentSeg.id}
            />
          )}
        </div>

        {/* Recording + Translation */}
        {!scoreResult && (
          <div className="space-y-3">
            <SpeechRecorder
              onTranscript={handleTranscript}
              disabled={scoring}
            />
            {transcript && (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Your translation (edit if needed):</p>
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-400 min-h-[100px] text-base leading-relaxed resize-none"
                  placeholder="Review or edit your translation..."
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleSubmit}
                    disabled={scoring}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-md text-sm font-medium transition-colors"
                  >
                    {scoring ? "Scoring..." : "Submit"}
                  </button>
                  <button
                    onClick={() => setTranscript("")}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-md text-sm transition-colors"
                  >
                    Re-record
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Score result */}
        {scoreResult && (
          <div className="space-y-3">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Your translation:</p>
              <p className="text-white text-sm">{transcript}</p>
            </div>

            <ScoreDisplay result={scoreResult} mode={feedbackMode} />

            {showAnswer && (
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                {currentSeg.hasEnglishRef && currentSeg.englishRef ? (
                  <>
                    <p className="text-xs text-gray-500 mb-1">
                      Answer (from subtitles):
                    </p>
                    <p className="text-gray-200">{currentSeg.englishRef}</p>
                    <p className="text-xs text-gray-500 mt-3 mb-1">
                      Sample reference:
                    </p>
                    <p className="text-gray-400 text-sm italic">{scoreResult.referenceSample}</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-gray-500 mb-1">
                      Sample reference:
                    </p>
                    <p className="text-gray-200 italic">{scoreResult.referenceSample}</p>
                  </>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-md text-sm transition-colors"
              >
                Retry
              </button>
              {!showAnswer && (
                <button
                  onClick={() => setShowAnswer(true)}
                  className="px-4 py-2 bg-orange-900 hover:bg-orange-800 text-orange-200 rounded-md text-sm transition-colors"
                >
                  Show Answer
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={currentIndex >= segments.length - 1}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-md text-sm font-medium transition-colors"
              >
                Next Segment
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
