"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  createSpeechRecognition,
  isSpeechRecognitionSupported,
} from "@/lib/speech";

interface SpeechRecorderProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export default function SpeechRecorder({
  onTranscript,
  disabled,
}: SpeechRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [interim, setInterim] = useState("");
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<ReturnType<
    typeof createSpeechRecognition
  > | null>(null);
  const finalTranscriptRef = useRef("");

  useEffect(() => {
    setSupported(isSpeechRecognitionSupported());
  }, []);

  const startRecording = useCallback(() => {
    finalTranscriptRef.current = "";
    setInterim("");

    const rec = createSpeechRecognition(
      (result) => {
        if (result.isFinal) {
          finalTranscriptRef.current += result.transcript;
          setInterim("");
        } else {
          setInterim(result.transcript);
        }
      },
      (error) => {
        console.error("Speech recognition error:", error);
        setRecording(false);
      }
    );

    if (rec) {
      recognitionRef.current = rec;
      rec.start();
      setRecording(true);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setRecording(false);

    setTimeout(() => {
      const transcript = finalTranscriptRef.current.trim();
      if (transcript) {
        onTranscript(transcript);
      }
      setInterim("");
    }, 300);
  }, [onTranscript]);

  if (!supported) {
    return (
      <div className="bg-yellow-950 border border-yellow-800 text-yellow-300 px-4 py-3 rounded-lg text-sm">
        Speech recognition is not supported in this browser. Please use Chrome
        or Edge.
      </div>
    );
  }

  return (
    <div>
      <button
        onMouseDown={startRecording}
        onMouseUp={stopRecording}
        onMouseLeave={() => recording && stopRecording()}
        onTouchStart={(e) => {
          e.preventDefault();
          startRecording();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          stopRecording();
        }}
        disabled={disabled}
        className={`w-full py-4 rounded-lg text-sm font-medium transition-all ${recording
            ? "bg-red-600 hover:bg-red-700 text-white animate-pulse shadow-lg shadow-red-900/20"
            : "bg-gray-800 hover:bg-gray-700 text-gray-300"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {recording ? "Recording... Release to stop" : "Hold to Record"}
      </button>
      {(recording || interim) && (
        <div className="mt-2 text-sm text-gray-400 italic">
          {finalTranscriptRef.current}
          {interim && <span className="text-gray-500">{interim}</span>}
        </div>
      )}
    </div>
  );
}
