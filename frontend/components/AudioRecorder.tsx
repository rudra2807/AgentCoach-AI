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
        <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
            <p className="text-sm font-medium">Record audio</p>
            <p className="mt-1 text-xs text-neutral-400">
                Record, listen, then analyze
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
                {!isRecording && !audioUrl && (
                    <button
                        onClick={start}
                        className="rounded-xl bg-accent-600 px-3 py-2 text-sm text-white"
                    >
                        Start recording
                    </button>
                )}

                {isRecording && (
                    <button
                        onClick={stop}
                        className="rounded-xl bg-red-600 px-3 py-2 text-sm text-white"
                    >
                        Stop recording
                    </button>
                )}

                {audioUrl && (
                    <>
                        <button
                            onClick={() => {
                                if (!audioRef.current) return;

                                if (isPlaying) {
                                    audioRef.current.pause();
                                    setIsPlaying(false);
                                } else {
                                    audioRef.current.play();
                                    setIsPlaying(true);
                                }
                            }}
                            className="rounded-xl border border-neutral-700 px-3 py-2 text-sm text-neutral-200"
                        >
                            {isPlaying ? "Pause" : "Play"}
                        </button>

                        <button
                            onClick={() => {
                                const file = getFile();
                                if (!file) return;
                                onRecorded(file);
                            }}
                            className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-neutral-950"
                        >
                            Use this recording
                        </button>

                        <button
                            onClick={() => {
                                clear();
                                setIsPlaying(false);
                            }}
                            className="rounded-xl px-3 py-2 text-sm text-neutral-400"
                        >
                            Discard
                        </button>
                    </>
                )}
            </div>

            {audioUrl && (
                <audio
                    ref={audioRef}
                    src={audioUrl}
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                />
            )}
        </div>
    );
}
