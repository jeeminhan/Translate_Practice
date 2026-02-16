// Browser Web Speech API wrapper
// Google Cloud STT can be added later as a provider

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface SpeechRecognitionResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}

export type OnResultCallback = (result: SpeechRecognitionResult) => void;
export type OnErrorCallback = (error: string) => void;

function getRecognitionClass(): any | null {
  if (typeof window === "undefined") return null;
  return (
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition ||
    null
  );
}

export function isSpeechRecognitionSupported(): boolean {
  return !!getRecognitionClass();
}

export function createSpeechRecognition(
  onResult: OnResultCallback,
  onError: OnErrorCallback,
  lang: string = "en-US"
): {
  start: () => void;
  stop: () => void;
  abort: () => void;
} | null {
  const SpeechRecognitionClass = getRecognitionClass();
  if (!SpeechRecognitionClass) {
    onError("Speech recognition is not supported in this browser.");
    return null;
  }

  const recognition = new SpeechRecognitionClass();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = lang;

  recognition.onresult = (event: any) => {
    let transcript = "";
    let isFinal = false;
    let confidence = 0;

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      transcript += result[0].transcript;
      if (result.isFinal) {
        isFinal = true;
        confidence = result[0].confidence;
      }
    }

    onResult({ transcript, isFinal, confidence });
  };

  recognition.onerror = (event: any) => {
    onError(event.error);
  };

  return {
    start: () => recognition.start(),
    stop: () => recognition.stop(),
    abort: () => recognition.abort(),
  };
}
