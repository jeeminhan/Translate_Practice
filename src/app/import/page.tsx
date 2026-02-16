"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ImportPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"youtube" | "local">("youtube");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    videoId: string;
    title: string;
    segmentCount: number;
  } | null>(null);

  const [jpSubFile, setJpSubFile] = useState<File | null>(null);
  const [enSubFile, setEnSubFile] = useState<File | null>(null);
  const [localTitle, setLocalTitle] = useState("");

  async function handleYoutubeImport() {
    if (!youtubeUrl.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: youtubeUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess({
        videoId: data.videoId,
        title: data.title,
        segmentCount: data.segmentCount,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleLocalImport() {
    if (!jpSubFile || !localTitle.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("title", localTitle);
      formData.append("jpSubs", jpSubFile);
      if (enSubFile) formData.append("enSubs", enSubFile);

      const res = await fetch("/api/videos", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess({
        videoId: data.videoId,
        title: localTitle,
        segmentCount: data.segmentCount,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <div className="text-green-400 text-4xl mb-4">&#10003;</div>
        <h2 className="text-xl font-bold mb-2">Import Successful!</h2>
        <p className="text-gray-400 mb-6">
          &quot;{success.title}&quot; — {success.segmentCount} segments
          extracted
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.push(`/video/${success.videoId}`)}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
          >
            Edit Segments
          </button>
          <button
            onClick={() => router.push(`/video/${success.videoId}/practice`)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors"
          >
            Start Practicing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Import Video</h1>

      <div className="flex border-b border-gray-800 mb-6">
        <button
          onClick={() => setActiveTab("youtube")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "youtube"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          YouTube
        </button>
        <button
          onClick={() => setActiveTab("local")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "local"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          Local Files
        </button>
        <span className="px-4 py-2 text-sm text-gray-600 cursor-not-allowed">
          EN → JP (Coming Soon)
        </span>
      </div>

      {error && (
        <div className="bg-red-950 border border-red-800 text-red-300 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {activeTab === "youtube" && (
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            YouTube URL
          </label>
          <input
            type="text"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-2">
            Works best with videos that have Japanese subtitles. English subs
            are optional.
          </p>
          <button
            onClick={handleYoutubeImport}
            disabled={loading || !youtubeUrl.trim()}
            className="mt-4 w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? "Extracting subtitles..." : "Import from YouTube"}
          </button>
        </div>
      )}

      {activeTab === "local" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Title</label>
            <input
              type="text"
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              placeholder="e.g. My Favorite Anime Episode 1"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Japanese Subtitles (SRT or ASS) *
            </label>
            <input
              type="file"
              accept=".srt,.ass,.ssa"
              onChange={(e) => setJpSubFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-800 file:text-gray-300 hover:file:bg-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              English Subtitles (optional)
            </label>
            <input
              type="file"
              accept=".srt,.ass,.ssa"
              onChange={(e) => setEnSubFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-800 file:text-gray-300 hover:file:bg-gray-700"
            />
          </div>
          <button
            onClick={handleLocalImport}
            disabled={loading || !jpSubFile || !localTitle.trim()}
            className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? "Importing..." : "Import Local Files"}
          </button>
        </div>
      )}
    </div>
  );
}
