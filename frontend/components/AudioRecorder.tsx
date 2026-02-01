"use client";

import { useRef, useState } from "react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";

type Props = {
  onRecorded: (file: File) => void;
};

export default function AudioRecorder({ onRecorded }: Props) {
  const {
    start,
    stop,
    clear,
    getFile,
    isRecording,
    audioUrl,
  } = useAudioRecorder();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  return (
    <div className="rounded-2xl border border-neutral-800 bg-gradient-to-br from-neutral-900 to-neutral-950 p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Record audio</p>
          <p className="mt-1 text-xs text-neutral-400">
            Record, listen, then analyze
          </p>
        </div>

        {isRecording && (
          <span className="flex items-center gap-2 text-xs text-red-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            Recording
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="mt-4 flex flex-wrap gap-2">
        {!isRecording && !audioUrl && (
          <button
            onClick={start}
            className="flex items-center gap-2 rounded-xl bg-accent-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-500 active:scale-95"
          >
            <span className="h-2 w-2 rounded-full bg-white" />
            Start recording
          </button>
        )}

        {isRecording && (
          <button
            onClick={stop}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500 active:scale-95"
          >
            Stop recording
          </button>
        )}

        {audioUrl && (
          <>
            <button
              onClick={() => {
                const file = getFile();
                if (!file) return;
                onRecorded(file);
              }}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200"
            >
              Use recording
            </button>

            <button
              onClick={() => {
                clear();
                setIsPlaying(false);
              }}
              className="rounded-xl px-4 py-2 text-sm text-neutral-400 transition hover:text-neutral-200"
            >
              Discard
            </button>
          </>
        )}
      </div>

      {/* Hidden audio */}
      {audioUrl && (
        <audio
            ref={audioRef}
            src={audioUrl}
            controls
            playsInline
            preload="metadata"
            onEnded={() => setIsPlaying(false)}
            className="mt-3 w-full rounded-lg"
        />
            )}
            </div>
  );
}
