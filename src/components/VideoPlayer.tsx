"use client";

import { useRef, useEffect, useCallback, memo } from "react";
import dynamic from "next/dynamic";

// Dynamically import ReactPlayer with no SSR to avoid hydration mismatches
// and ensure we're running in the browser.
// eslint-disable-next-line
const ReactPlayer = dynamic(() => import("react-player/lazy"), { ssr: false }) as any;

interface VideoPlayerProps {
  url: string;
  startTime?: number;
  endTime?: number;
  playing: boolean;
  playbackRate: number;
  seekTrigger?: number;
  onEnded?: () => void;
  onProgress?: (played: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
}

function safeSeeKTo(playerRef: any, time: number) {
  try {
    const player = playerRef.current;
    if (player && typeof player.seekTo === "function") {
      player.seekTo(time, "seconds");
      return true;
    }
  } catch {
    // Player not ready yet
  }
  return false;
}

function VideoPlayer({
  url,
  startTime,
  endTime,
  playing,
  playbackRate,
  seekTrigger,
  onEnded,
  onProgress,
  onPlay,
  onPause,
}: VideoPlayerProps) {
  const playerRef = useRef<any>(null);
  const isReadyRef = useRef(false);
  const pendingSeekRef = useRef<number | null>(null);
  const endTimeRef = useRef(endTime);
  const onEndedRef = useRef(onEnded);
  const onProgressRef = useRef(onProgress);
  const startTimeRef = useRef(startTime);

  // Keep refs in sync
  endTimeRef.current = endTime;
  onEndedRef.current = onEnded;
  onProgressRef.current = onProgress;
  startTimeRef.current = startTime;

  // When startTime changes, seek (or queue seek if not ready)
  useEffect(() => {
    if (startTime === undefined) return;
    if (isReadyRef.current) {
      safeSeeKTo(playerRef, startTime);
    } else {
      pendingSeekRef.current = startTime;
    }
  }, [startTime]);

  // Replay: seek back when seekTrigger increments
  useEffect(() => {
    if (!seekTrigger) return;
    const time = startTimeRef.current;
    if (time !== undefined && isReadyRef.current) {
      safeSeeKTo(playerRef, time);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekTrigger]);

  const handleReady = useCallback(() => {
    isReadyRef.current = true;
    // Process any pending seek
    if (pendingSeekRef.current !== null) {
      safeSeeKTo(playerRef, pendingSeekRef.current);
      pendingSeekRef.current = null;
    } else if (startTimeRef.current !== undefined) {
      safeSeeKTo(playerRef, startTimeRef.current);
    }
  }, []);

  const handleProgress = useCallback((state: any) => {
    if (onProgressRef.current) {
      onProgressRef.current(state.playedSeconds);
    }

    if (
      endTimeRef.current !== undefined &&
      state.playedSeconds >= endTimeRef.current
    ) {
      console.log(`[VideoPlayer] reached end time: ${state.playedSeconds} >= ${endTimeRef.current}`);
      if (onEndedRef.current) {
        onEndedRef.current();
      }
    }
  }, []);

  return (
    <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
      <ReactPlayer
        ref={playerRef}
        url={url}
        playing={playing}
        playbackRate={playbackRate}
        onReady={handleReady}
        onProgress={handleProgress}
        onPlay={onPlay}
        onPause={onPause}
        progressInterval={100}
        width="100%"
        height="100%"
        controls
      />
    </div>
  );
}

export default memo(VideoPlayer);
