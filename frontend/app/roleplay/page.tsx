"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ChatMsg = {
  role: "Customer" | "Agent";
  text: string;
  ts: number;
  meta?: Record<string, any>;
};

export default function RoleplayPage() {
  const router = useRouter();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [stageId, setStageId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [analysis, setAnalysis] = useState<any | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const [analysisOpen, setAnalysisOpen] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const started = useMemo(() => !!sessionId, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  /* -------------------------------
     START ROLEPLAY
  --------------------------------*/
  async function start() {
    setLoading(true);
    setAnalysis(null);

    try {
      const res = await fetch("/api/roleplay/start", { method: "POST" });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error ?? "Failed to start roleplay");

      setSessionId(data.sessionId);
      setStageId(data.stageId);

      setMessages([
        {
          role: "Customer",
          text: data.botMessage.text,
          ts: Date.now(),
          meta: data.botMessage.meta,
        },
      ]);
    } catch (e: any) {
      alert(e?.message ?? "Error starting roleplay");
    } finally {
      setLoading(false);
    }
  }

  /* -------------------------------
     SEND AGENT MESSAGE
  --------------------------------*/
  async function send() {
    if (!sessionId) return;

    const text = input.trim();
    if (!text) return;

    setInput("");
    setMessages((prev) => [
      ...prev,
      { role: "Agent", text, ts: Date.now() },
    ]);
    setLoading(true);

    try {
      const res = await fetch("/api/roleplay/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, agentMessage: text }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to send response");

      setStageId(data.stageId);

      if (data.done) {
        setMessages((prev) => [
          ...prev,
          {
            role: "Customer",
            text: "Thanks — that’s helpful. (End of roleplay)",
            ts: Date.now(),
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "Customer",
          text: data.botMessage.text,
          ts: Date.now(),
          meta: data.botMessage.meta,
        },
      ]);
    } catch (e: any) {
      alert(e?.message ?? "Error sending message");
    } finally {
      setLoading(false);
    }
  }

  /* -------------------------------
     GET SESSION ANALYSIS
  --------------------------------*/
  async function getAnalysis() {
    if (!sessionId) return;

    setAnalyzing(true);

    try {
      const res = await fetch("/api/roleplay/analyze-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to analyze session");

      setAnalysis(data);
      setAnalysisOpen(true); // open modal
    } catch (e: any) {
      alert(e?.message ?? "Error analyzing session");
    } finally {
      setAnalyzing(false);
    }
  }


  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <header className="mb-6 flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs text-neutral-300">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
              AgentCoach AI
            </div>

            <h1 className="mt-4 text-2xl font-semibold">Roleplay Chat</h1>

            <p className="mt-2 text-sm text-neutral-400">
              Customer is the bot. You respond as the agent.
            </p>

            <p className="mt-2 text-xs text-neutral-500">
              {stageId ? `Stage: ${stageId}` : "Not started"}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => router.push("/")}
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-900"
            >
              Back
            </button>

            {!started && (
              <button
                onClick={start}
                disabled={loading}
                className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-neutral-950 disabled:opacity-50"
              >
                Start
              </button>
            )}

            {started && (
              <button
                onClick={getAnalysis}
                disabled={analyzing}
                className="rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-900 disabled:opacity-50"
              >
                {analyzing ? "Analyzing..." : "Get Analysis"}
              </button>
            )}
          </div>
        </header>

        {/* Chat */}
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
          <div className="h-[60vh] overflow-y-auto space-y-3 pr-2">
            {messages.length === 0 && (
              <div className="text-sm text-neutral-400">
                Click <span className="text-white">Start</span> to begin the roleplay.
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "Agent" ? "justify-end" : "justify-start"
                  }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${m.role === "Agent"
                    ? "bg-white text-neutral-950"
                    : "border border-neutral-800 bg-neutral-950 text-neutral-100"
                    }`}
                >
                  <div className="mb-1 text-[11px] opacity-70">
                    {m.role}
                  </div>
                  <div>{m.text}</div>
                </div>
              </div>
            ))}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="mt-4 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={!started || loading}
              placeholder={
                !started
                  ? "Click Start first..."
                  : "Type your response as the agent..."
              }
              className="flex-1 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none focus:border-neutral-700 disabled:opacity-50"
            />

            <button
              onClick={send}
              disabled={!started || loading || input.trim().length === 0}
              className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-neutral-950 disabled:opacity-50"
            >
              Send
            </button>
          </div>

          <div className="mt-3 text-xs text-neutral-500">
            MVP: sessions are in-memory. If the dev server restarts, sessions reset.
          </div>
        </section>

        {/* Analysis Panel */}
        {analysisOpen && analysis && (
          <AnalysisModal
            analysis={analysis}
            onClose={() => setAnalysisOpen(false)}
          />
        )}


      </div>
    </main>
  );

  function AnalysisModal({
    analysis,
    onClose
  }: {
    analysis: any;
    onClose: () => void;
  }) {
    useEffect(() => {
      function handleEsc(e: KeyboardEvent) {
        if (e.key === "Escape") onClose();
      }
      window.addEventListener("keydown", handleEsc);
      return () => window.removeEventListener("keydown", handleEsc);
    }, [onClose]);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
        <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-neutral-800 bg-neutral-950 p-8 shadow-2xl">

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-6 top-6 text-sm text-neutral-400 hover:text-white"
          >
            Close ✕
          </button>

          {/* Title */}
          <h2 className="mb-6 text-2xl font-semibold">Session Performance Review</h2>

          {/* Score Overview */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-8">
            <ScoreCard label="Overall" value={analysis.overall_score} accent="bg-blue-600" />
            <ScoreCard label="Clarity" value={analysis.clarity_score} accent="bg-green-600" />
            <ScoreCard label="Discovery" value={analysis.discovery_score} accent="bg-purple-600" />
            <ScoreCard label="Pushiness" value={analysis.pushiness_score} accent="bg-red-600" inverse />
          </div>

          {/* Insight Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            <InsightCard
              title="Strengths"
              items={analysis.strengths}
              tone="positive"
            />

            <InsightCard
              title="Key Mistakes"
              items={analysis.key_mistakes}
              tone="negative"
            />

            <InsightCard
              title="Missed Opportunities"
              items={analysis.missed_opportunities}
              tone="neutral"
            />

            <ExpandableCard
              title="Coaching Summary"
              content={analysis.coaching_summary}
            />
          </div>
        </div>
      </div>
    );
  }

  function ScoreCard({
    label,
    value,
    accent,
    inverse = false
  }: {
    label: string;
    value: number;
    accent: string;
    inverse?: boolean;
  }) {
    const percent = Math.max(0, Math.min(100, value));

    return (
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
        <div className="text-xs text-neutral-400">{label}</div>

        <div className="mt-2 flex items-end justify-between">
          <div className="text-2xl font-semibold">{percent}</div>
          <div className="text-xs text-neutral-500">/ 100</div>
        </div>

        <div className="mt-3 h-2 w-full rounded-full bg-neutral-800">
          <div
            className={`h-2 rounded-full ${accent}`}
            style={{ width: `${inverse ? 100 - percent : percent}%` }}
          />
        </div>
      </div>
    );
  }

  function InsightCard({
    title,
    items,
    tone
  }: {
    title: string;
    items: string[];
    tone: "positive" | "negative" | "neutral";
  }) {
    const toneStyles =
      tone === "positive"
        ? "border-green-700 bg-green-950/30"
        : tone === "negative"
          ? "border-red-700 bg-red-950/30"
          : "border-neutral-800 bg-neutral-900";

    return (
      <div className={`rounded-2xl border p-4 ${toneStyles}`}>
        <div className="mb-2 text-sm font-medium">{title}</div>

        {items && items.length > 0 ? (
          <ul className="space-y-2 text-sm text-neutral-300">
            {items.map((item, i) => (
              <li key={i} className="leading-relaxed">
                • {item}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-neutral-500">No major issues detected.</div>
        )}
      </div>
    );
  }

  function ExpandableCard({
    title,
    content
  }: {
    title: string;
    content: string;
  }) {
    const [open, setOpen] = useState(false);

    return (
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
        <button
          onClick={() => setOpen(!open)}
          className="flex w-full items-center justify-between text-sm font-medium"
        >
          {title}
          <span className="text-xs text-neutral-500">
            {open ? "Hide" : "Expand"}
          </span>
        </button>

        {open && (
          <div className="mt-3 text-sm leading-relaxed text-neutral-300">
            {content}
          </div>
        )}
      </div>
    );
  }

}
