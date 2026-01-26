"use client";

import { useEffect, useRef, useState } from "react";

type ConversationType =
  | "Open house follow-up"
  | "Buyer consult"
  | "Listing consult"
  | "Cold outreach";

const DEMOS = [
  {
    id: "open-house",
    title: "Demo: Open house follow-up",
    subtitle: "Good rapport, weak next step",
    type: "Open house follow-up" as ConversationType,
  },
  {
    id: "overtalking",
    title: "Demo: Over-talking agent",
    subtitle: "Misses client signals",
    type: "Buyer consult" as ConversationType,
  },
  {
    id: "no-cta",
    title: "Demo: No next step",
    subtitle: "Ends without momentum",
    type: "Cold outreach" as ConversationType,
  },
];

export default function Page() {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [demoId, setDemoId] = useState<string | null>(null);
  const [conversationType, setConversationType] =
    useState<ConversationType>("Open house follow-up");

  const canAnalyze = Boolean(file || demoId);
  const [status, setStatus] = useState("loading...");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/health-check")
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("error"));
  }, []);

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
                mp3, wav, m4a, mp4, mov · max 5–10 minutes
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

          {/* Demo buttons */}
          <div className="mt-4">
            <p className="text-xs font-medium text-neutral-300">
              Or try a demo
            </p>

            <div className="mt-2 space-y-2">
              {DEMOS.map((d) => {
                const active = demoId === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => {
                      setDemoId(d.id);
                      setFile(null);
                      setConversationType(d.type);
                    }}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition
                      ${active
                        ? "border-accent-500 bg-accent-500/10"
                        : "border-neutral-800 bg-neutral-950/40"
                      }`}
                  >
                    <p className="text-sm font-medium">{d.title}</p>
                    <p className="mt-1 text-xs text-neutral-400">
                      {d.subtitle}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Analyze CTA */}
        <button
          disabled={!canAnalyze}
          className={`mt-4 w-full rounded-2xl py-4 text-sm font-semibold transition
            ${canAnalyze
              ? "bg-white text-neutral-950"
              : "bg-neutral-800 text-neutral-400"
            }`}
        >
          Analyze
        </button>

        <p className="mt-3 text-center text-[11px] text-neutral-500">
          Tip: Use a demo sample for smoother live demos.
        </p>
      </section>
    </main>
  );
}
