"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface VideoSummary {
  id: string;
  title: string;
  sourceType: string;
  segmentCount: number;
  avgScore: number | null;
  lastPracticed: string | null;
  createdAt: string;
}

function scoreColor(score: number | null): string {
  if (score === null) return "text-gray-500";
  if (score >= 8) return "text-green-400";
  if (score >= 5) return "text-yellow-400";
  return "text-red-400";
}

export default function Dashboard() {
  const [videos, setVideos] = useState<VideoSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    loadVideos();
  }, []);

  async function loadVideos() {
    try {
      const res = await fetch("/api/videos");
      const data = await res.json();

      const demoExists = data.some((v: VideoSummary) => v.title === "[Demo] Japanese Home Appliances");

      if (!demoExists) {
        // Auto-seed demo if it doesn't exist (even if other videos do)
        setSeeding(true);
        // Show existing videos while seeding demo
        setVideos(data);

        try {
          await fetch("/api/seed", { method: "POST" });
          // Re-fetch after seeding
          const res2 = await fetch("/api/videos");
          const data2 = await res2.json();
          setVideos(data2);
          setLoading(false);
        } catch (err) {
          console.error("Failed to seed demo:", err);
          setLoading(false);
        } finally {
          setSeeding(false);
        }
      } else {
        setVideos(data);
        setLoading(false);
      }
    } catch (error) {
      console.error("Failed to load videos:", error);
      setLoading(false);
    }
  }

  const isDemo = (title: string) => title.startsWith("[Demo]");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link
          href="/import"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          + Import Video
        </Link>
      </div>

      {loading || seeding ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400 text-lg">
            {seeding ? "Setting up your demo video..." : "Loading videos..."}
          </p>
        </div>
      ) : videos.length === 0 ? (
        // Fallback empty state (should rarely be seen due to auto-seed)
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg mb-4">No videos imported yet</p>
          <Link
            href="/import"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Import your first video
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {videos.map((video) => (
            <div
              key={video.id}
              className={`border rounded-lg p-5 transition-all ${isDemo(video.title)
                ? "bg-gradient-to-r from-gray-900 to-gray-800 border-blue-500/50 hover:border-blue-400 shadow-lg shadow-blue-500/10"
                : "bg-gray-900 border-gray-800 hover:border-gray-700"
                }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {isDemo(video.title) && (
                      <span className="px-2 py-0.5 rounded textxs font-bold bg-blue-500 text-white text-[10px] uppercase tracking-wider">
                        Demo
                      </span>
                    )}
                    <h2 className="font-semibold text-white text-lg">
                      {video.title.replace("[Demo] ", "")}
                    </h2>
                  </div>

                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      {video.segmentCount} segments
                    </span>

                    <span className={`flex items-center gap-1 ${scoreColor(video.avgScore)}`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      {video.avgScore !== null
                        ? `Avg Score: ${video.avgScore.toFixed(1)}/10`
                        : "Not practiced yet"}
                    </span>

                    {video.lastPracticed && (
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Last: {new Date(video.lastPracticed).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/video/${video.id}`}
                    className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors border border-gray-700"
                  >
                    Edit Segments
                  </Link>
                  <Link
                    href={`/video/${video.id}/practice`}
                    className={`px-4 py-2 text-sm rounded-lg transition-colors font-medium border ${isDemo(video.title)
                      ? "bg-blue-600 hover:bg-blue-700 text-white border-transparent shadow-lg shadow-blue-900/50"
                      : "bg-blue-600 hover:bg-blue-700 text-white border-transparent"
                      }`}
                  >
                    Start Practice
                  </Link>
                  <Link
                    href={`/video/${video.id}/review`}
                    className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors border border-gray-700"
                  >
                    Review
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
