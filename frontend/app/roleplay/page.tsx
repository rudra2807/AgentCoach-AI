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
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const started = useMemo(() => !!sessionId, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function start() {
    setLoading(true);
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
          meta: data.botMessage.meta
        }
      ]);
    } catch (e: any) {
      alert(e?.message ?? "Error starting roleplay");
    } finally {
      setLoading(false);
    }
  }

  async function send() {
    if (!sessionId) return;

    const text = input.trim();
    if (!text) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "Agent", text, ts: Date.now() }]);
    setLoading(true);

    try {
      const res = await fetch("/api/roleplay/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, agentMessage: text })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to send response");

      setStageId(data.stageId);

      if (data.done) {
        setMessages((prev) => [
          ...prev,
          { role: "Customer", text: "Thanks — that’s helpful. (End of roleplay)", ts: Date.now() }
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "Customer",
          text: data.botMessage.text,
          ts: Date.now(),
          meta: data.botMessage.meta
        }
      ]);
    } catch (e: any) {
      alert(e?.message ?? "Error sending message");
    } finally {
      setLoading(false);
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
          </div>
        </header>

        {/* Chat container */}
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
          <div className="h-[60vh] overflow-y-auto space-y-3 pr-2">
            {messages.length === 0 && (
              <div className="text-sm text-neutral-400">
                Click <span className="text-white">Start</span> to begin the roleplay.
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "Agent" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                    m.role === "Agent"
                      ? "bg-white text-neutral-950"
                      : "border border-neutral-800 bg-neutral-950 text-neutral-100"
                  }`}
                >
                  <div className="mb-1 text-[11px] opacity-70">
                    {m.role === "Agent" ? "Agent" : "Customer"}
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
              placeholder={!started ? "Click Start first..." : "Type your response as the agent..."}
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
      </div>
    </main>
  );
}
