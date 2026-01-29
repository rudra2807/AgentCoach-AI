"use client";

import { useEffect, useRef, useState } from "react";

type ConversationType =
  | "Open house follow-up"
  | "Buyer consult"
  | "Listing consult"
  | "Cold outreach";

export default function Page() {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isAnalyzingTranscribe, setIsAnalyzingTranscribe] = useState(false);
  const [demoId, setDemoId] = useState<string | null>(null);
  const [conversationType, setConversationType] =
    useState<ConversationType>("Open house follow-up");

  const canAnalyze = Boolean(file || demoId);
  const [status, setStatus] = useState("loading...");

  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const analyzeCall = async (full_transcript : string) => {
    setLoading(true);
    const res = await fetch("http://127.0.0.1:8000/analyze-transcript", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript: full_transcript
      }),
    });

    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  const buildCards = (analysis: any) => {
  if (!analysis) return [];

  return [
    {
      title: "Conversation Summary",
      content: analysis.conversation_summary,
    },
    {
      title: "What Worked",
      content: analysis.what_worked,
      type: "list",
    },
    {
      title: "What Hurt Conversion",
      content: analysis.what_hurt_conversion,
      type: "list",
    },
    {
      title: "Missed Opportunity",
      content: analysis.missed_opportunity.description,
      badge: analysis.missed_opportunity.type,
    },
    {
      title: "What To Say Instead",
      content: analysis.what_to_say_instead.rewritten_follow_up,
    },
  ];
};

function SwipeCards({ analysis }: { analysis: any }) {
  const cards = buildCards(analysis);

  return (
    <div className="mt-6">
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4">
        {cards.map((card, idx) => (
          <div
            key={idx}
            className="min-w-[85%] snap-center rounded-2xl border border-neutral-800 bg-neutral-950 p-5"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{card.title}</h3>
              {card.badge && (
                <span className="rounded-full bg-accent-600/20 px-2 py-0.5 text-[10px] text-accent-400">
                  {card.badge}
                </span>
              )}
            </div>

            {card.type === "list" ? (
              <ul className="space-y-2 text-sm text-neutral-300">
                {card.content.map((item: string, i: number) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-accent-500" />
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm leading-relaxed text-neutral-300">
                {card.content}
              </p>
            )}
          </div>
        ))}
      </div>

      <p className="mt-2 text-center text-xs text-neutral-500">
        Swipe to see insights →
      </p>
    </div>
  );
}



  useEffect(() => {
    fetch("http://127.0.0.1:8000/health-check")
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("error"));
  }, []);

  const transcribe = async () => {
    if (!file || isTranscribing) return;

    setIsTranscribing(true);

    try {
      const formData = new FormData();
      formData.append("conversation_type", conversationType);
      formData.append("file", file);

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Transcription failed");
      }

      const data = await res.json();
      console.log("Transcription:", JSON.stringify(data, null, 2));
      return JSON.stringify(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTranscribing(false);
    }
  };

  const analyze = async (transcriptText: string | undefined) => {
    setIsAnalyzingTranscribe(true);

    try {
      const formData = new FormData();
      // formData.append("conversation_type", conversationType);
      formData.append("transcript", transcriptText!);

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcript: transcriptText,
        }),
      });

      if (!res.ok) {
        throw new Error("Transcription failed");
      }

      const data = await res.json();
      console.log("Analysis:", JSON.stringify(data, null, 2));
      console.log("Keys:", Object.keys(data));

      setResult(data);

    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzingTranscribe(false);
    }
  }

  return (
    <main className="px-4 pt-8 pb-10">
      {/* Header */}
      <header className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs text-neutral-300">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
          AgentCoach AI
        </div>

        <h1 className="mt-4 text-2xl font-semibold leading-tight">
          AI Coaching for Real Estate Conversations
        </h1>

        <p className="mt-2 text-sm text-neutral-400">
          Upload a call. Get clear coaching. Improve your follow-up in minutes.
        </p>
      </header>

      {/* Main card */}
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
        {/* Conversation type */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-neutral-300">
            Conversation type
          </label>
          <select
            value={conversationType}
            onChange={(e) =>
              setConversationType(e.target.value as ConversationType)
            }
            className="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-3 text-sm text-neutral-100 focus:outline-none"
          >
            <option>Open house follow-up</option>
            <option>Buyer consult</option>
            <option>Listing consult</option>
            <option>Cold outreach</option>
          </select>
        </div>

        {/* Upload */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Upload audio or video</p>
              <p className="mt-1 text-xs text-neutral-400">
                mp3, wav, m4a, mp4, mov · max 5-10 minutes
              </p>
            </div>

            <button
              onClick={() => {
                setDemoId(null);
                fileRef.current?.click();
              }}
              className="rounded-xl bg-accent-600 px-3 py-2 text-sm font-medium text-white"
            >
              Choose
            </button>

            <input
              ref={fileRef}
              type="file"
              accept=".mp3,.wav,.m4a,.mp4,.mov"
              className="hidden"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setDemoId(null);
              }}
            />
          </div>

          {(file || demoId) && (
            <div className="mt-3 flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2">
              <p className="text-xs text-neutral-300 truncate">
                {file ? file.name : "Using demo sample"}
              </p>
              <button
                onClick={() => {
                  setFile(null);
                  setDemoId(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="text-xs text-neutral-400"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Analyze CTA */}
        <button
          disabled={!canAnalyze || isTranscribing || isAnalyzingTranscribe}
          className={`mt-4 w-full rounded-2xl py-4 text-sm font-semibold transition flex items-center justify-center gap-2
    ${canAnalyze && !isTranscribing && !isAnalyzingTranscribe
              ? "bg-white text-neutral-950"
              : "bg-neutral-800 text-neutral-400"
            }`}
          onClick={() => {
            transcribe().then((transcript) => {
              analyze(transcript);
            });
          }}
        >
          {isTranscribing || isAnalyzingTranscribe ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-950 border-t-transparent" />
              {isTranscribing ? "Transcribing…" : "Analyzing Transcribe..."}
            </>
          ) : (
            "Analyze"
          )}
        </button>

        {result && <SwipeCards analysis={result} />}
        {result && (
            <button
              onClick={() => {
                setResult(null);
                setFile(null);
                setDemoId(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="mt-4 w-full rounded-2xl border border-neutral-800 bg-neutral-950 py-3 text-sm font-medium text-neutral-300 hover:bg-neutral-900"
            >
              Analyze new
            </button>
          )}

      </section>

    </main>
  );
}
