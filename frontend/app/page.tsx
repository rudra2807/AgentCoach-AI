"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signInAnonymously } from "firebase/auth";
import { auth } from "./lib/firebase";
import AudioRecorder from "@/components/AudioRecorder";

type ConversationType = "General Sales" | "Open House" | "Buyer Consultation";
type Phase = "idle" | "transcribing" | "analyzing" | "done";

/* ─────────────────────────────────────────────
   SCORE RING
───────────────────────────────────────────── */
function ScoreRing({
  value,
  label,
  color,
  inverse = false,
  delay = 0,
}: {
  value: number;
  label: string;
  color: string;
  inverse?: boolean;
  delay?: number;
}) {
  const [animated, setAnimated] = useState(false);
  const pct = Math.max(0, Math.min(100, inverse ? 100 - value : value));
  const r = 30;
  const circ = 2 * Math.PI * r;
  const dash = animated ? circ - (pct / 100) * circ : circ;

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ position: "relative", width: 80, height: 80 }}>
        <svg width="80" height="80" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="40" cy="40" r={r} fill="none" stroke="#222" strokeWidth="7" />
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeDasharray={circ}
            strokeDashoffset={dash}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)" }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            fontWeight: 700,
            fontFamily: "'DM Mono', monospace",
            color: "#f5f5f5",
          }}
        >
          {value}
        </div>
      </div>
      <div style={{ fontSize: 11, color: "#888", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   INSIGHT PANEL
───────────────────────────────────────────── */
function InsightCard({
  title,
  content,
  accent,
  bg,
  isList = false,
}: {
  title: string;
  content: string | string[];
  accent: string;
  bg: string;
  isList?: boolean;
}) {
  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${accent}22`,
        borderRadius: 16,
        padding: "16px 18px",
        minWidth: "calc(100% - 24px)",  // ← was "82vw"
        maxWidth: "calc(100% - 24px)",  // ← was 360
        scrollSnapAlign: "center",
        flexShrink: 0,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: accent, marginBottom: 10, letterSpacing: "0.05em", textTransform: "uppercase" }}>
        {title}
      </div>
      {isList && Array.isArray(content) ? (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
          {content.map((item, i) => (
            <li key={i} style={{ fontSize: 13, color: "#ccc", lineHeight: 1.5, display: "flex", gap: 8 }}>
              <span style={{ color: accent, flexShrink: 0 }}>—</span>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ fontSize: 13, color: "#ccc", lineHeight: 1.65, margin: 0 }}>{content as string}</p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   SWIPE CARDS
───────────────────────────────────────────── */
function SwipeCards({ analysis }: { analysis: any }) {
  const cards = [
    { title: "◎ Summary", content: analysis.conversation_summary?.text ?? "—", accent: "#4f8ef7", bg: "#0a0e1a", isList: false },
    { title: "✦ What Worked", content: (analysis.what_worked ?? []).map((i: any) => i.point), accent: "#4caf82", bg: "#0a1a10", isList: true },
    { title: "✧ What Hurt Conversion", content: (analysis.what_hurt_conversion ?? []).map((i: any) => i.point), accent: "#f87171", bg: "#1a0a0a", isList: true },
    { title: "◈ Missed Opportunity", content: analysis.missed_opportunity?.description ?? "—", accent: "#f59e0b", bg: "#1a1400", isList: false },
    { title: "↗ What To Say Instead", content: analysis.what_to_say_instead?.rewritten_follow_up ?? "—", accent: "#a78bfa", bg: "#110a1a", isList: false },
  ];

  return (
    <div style={{ marginTop: 24, overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          paddingBottom: 8,
          paddingLeft: 2,
          paddingRight: 20,
          WebkitOverflowScrolling: "touch",
          msOverflowStyle: "none",
          scrollbarWidth: "none",
        }}
      >
        {cards.map((card, i) => (
          <InsightCard key={i} {...card} />
        ))}
      </div>
      {/* <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 5,
          marginTop: 12,
        }}
      >
        {cards.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === 0 ? 16 : 5,
              height: 5,
              borderRadius: 99,
              background: i === 0 ? "#4f8ef7" : "#2a2a2a",
              transition: "all 0.2s",
            }}
          />
        ))}
      </div> */}
      <p style={{ textAlign: "center", fontSize: 11, color: "#444", marginTop: 8 }}>
        Swipe to explore insights →
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   CONVERSATION TYPE PILLS
───────────────────────────────────────────── */
function TypePills({
  value,
  onChange,
}: {
  value: ConversationType;
  onChange: (v: ConversationType) => void;
}) {
  const options: ConversationType[] = ["Open House", "Buyer Consultation", "General Sales"];
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          style={{
            padding: "7px 14px",
            borderRadius: 99,
            fontSize: 12,
            fontFamily: "'DM Mono', monospace",
            cursor: "pointer",
            border: `1px solid ${value === opt ? "#4f8ef755" : "#2a2a2a"}`,
            background: value === opt ? "#0e1a2e" : "#0d0d0d",
            color: value === opt ? "#4f8ef7" : "#666",
            transition: "all 0.15s",
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   PROGRESS STEPS
───────────────────────────────────────────── */
function ProgressSteps({ phase }: { phase: Phase }) {
  const steps = [
    { id: "transcribing", label: "Transcribing audio" },
    { id: "analyzing", label: "Analyzing conversation" },
    { id: "done", label: "Insights ready" },
  ];

  const activeIdx =
    phase === "transcribing" ? 0 : phase === "analyzing" ? 1 : phase === "done" ? 2 : -1;

  if (phase === "idle") return null;

  return (
    <div
      style={{
        margin: "20px 0 0",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {steps.map((step, i) => {
        const isActive = i === activeIdx;
        const isDone = i < activeIdx || phase === "done";

        return (
          <div key={step.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* indicator */}
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                border: `2px solid ${isDone ? "#4caf82" : isActive ? "#4f8ef7" : "#2a2a2a"}`,
                background: isDone ? "#0a1a10" : isActive ? "#0e1a2e" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all 0.3s",
              }}
            >
              {isDone ? (
                <span style={{ fontSize: 11, color: "#4caf82" }}>✓</span>
              ) : isActive ? (
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#4f8ef7",
                    animation: "pulse-dot 1.2s ease-in-out infinite",
                  }}
                />
              ) : null}
            </div>
            <span
              style={{
                fontSize: 12,
                color: isDone ? "#4caf82" : isActive ? "#e0e0e0" : "#444",
                fontFamily: "'DM Mono', monospace",
                transition: "color 0.3s",
              }}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function Page() {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [userID, setUserID] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [conversationType, setConversationType] = useState<ConversationType>("Open House");
  const [result, setResult] = useState<any>(null);

  // const canAnalyze = Boolean(file) && phase === "idle";
  const canAnalyze = Boolean(file) && Boolean(userID) && phase === "idle";

  useEffect(() => {
    signInAnonymously(auth)
      .then(async (r) => {
        setUserID(r.user.uid);
        await fetch("/api/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: r.user.uid }),
        });
      })
      .catch(console.error);
  }, []);

  async function transcribe(): Promise<string | undefined> {
    if (!file) return;
    setPhase("transcribing");

    const isVideo = (f: File) =>
      f.type.startsWith("video/") || /\.(mp4|mov|mkv|webm|avi|flv)$/i.test(f.name);

    let uploadFile: File = file;

    if (isVideo(file)) {
      const fd = new FormData();
      fd.append("file", file);
      const extractRes = await fetch("/api/extract-audio", { method: "POST", body: fd });
      if (!extractRes.ok) throw new Error("Audio extraction failed");
      const blob = await extractRes.blob();
      uploadFile = new File([blob], "extracted.wav", { type: "audio/wav" });
    }

    const formData = new FormData();
    formData.append("user_id", userID || "unknown");
    formData.append("conversation_type", conversationType);
    formData.append("file", uploadFile);

    const res = await fetch("/api/transcribe", { method: "POST", body: formData });
    if (!res.ok) throw new Error("Transcription failed");

    const data = await res.json();
    return data.transcript_text;
  }

  async function analyze(transcriptText: string | undefined) {
    if (!transcriptText) return;
    setPhase("analyzing");

    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: transcriptText }),
    });

    if (!res.ok) throw new Error("Analysis failed");
    const data = await res.json();
    setResult(data);
    setPhase("done");
  }

  async function run() {
    try {
      const transcript = await transcribe();
      await analyze(transcript);
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Something went wrong");
      setPhase("idle");
    }
  }

  function reset() {
    setResult(null);
    setFile(null);
    setPhase("idle");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,700;1,400&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080808; }

        @keyframes pulse-dot {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.3); opacity: 1; }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fade-up 0.4s ease-out both; }

        /* scrollbar hide */
        ::-webkit-scrollbar { display: none; }

        .upload-zone {
          transition: border-color 0.2s, background 0.2s;
        }
        .upload-zone:hover {
          border-color: #333 !important;
          background: #111 !important;
        }

        .pill-hover:hover {
          background: #f0f0f0 !important;
          color: #080808 !important;
        }
      `}</style>

      <main
        style={{
          minHeight: "100dvh",
          background: "#080808",
          color: "#f0f0f0",
          fontFamily: "'DM Mono', monospace",
          maxWidth: 480,
          margin: "0 auto",
          padding: "0 20px 48px",
        }}
      >
        {/* ── HEADER ── */}
        <header style={{ paddingTop: 32, marginBottom: 28 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              background: "#111",
              border: "1px solid #1e1e1e",
              borderRadius: 99,
              padding: "5px 12px",
              fontSize: 11,
              color: "#888",
              letterSpacing: "0.08em",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#4caf82",
                boxShadow: "0 0 6px #4caf82",
              }}
            />
            AgentCoach AI
          </div>

          <h1
            style={{
              marginTop: 16,
              fontSize: 28,
              fontFamily: "'Fraunces', serif",
              fontWeight: 700,
              lineHeight: 1.15,
              color: "#f5f5f5",
            }}
          >
            AI Coaching for Real Estate Conversations
          </h1>

          <p style={{ marginTop: 8, fontSize: 13, color: "#555", lineHeight: 1.6 }}>
            Upload a call. Get clear coaching. Improve your follow-up in minutes.
          </p>

          {/* Roleplay CTA */}
          <Link
            href="/roleplay"
            style={{
              marginTop: 16,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#0d0d0d",
              border: "1px solid #2a2a2a",
              borderRadius: 14,
              padding: "10px 16px",
              fontSize: 12,
              color: "#a78bfa",
              textDecoration: "none",
              letterSpacing: "0.04em",
              transition: "border-color 0.15s, background 0.15s",
            }}
          >
            <span style={{ fontSize: 15 }}>🎙</span>
            Practice with AI Roleplay
            <span style={{ color: "#444", fontSize: 11 }}>→</span>
          </Link>
        </header>

        {/* ── MAIN CARD ── */}
        <section
          style={{
            background: "#0d0d0d",
            border: "1px solid #1e1e1e",
            borderRadius: 22,
            padding: "20px",
          }}
        >
          {/* Conversation type */}
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 10,
                color: "#555",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              Conversation Type
            </div>
            <TypePills value={conversationType} onChange={setConversationType} />
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "#1a1a1a", margin: "0 -20px 20px" }} />

          {/* Recorder */}
          <div style={{ marginBottom: 16 }}>
            <AudioRecorder
              onRecorded={(f) => {
                setFile(f);
                if (fileRef.current) fileRef.current.value = "";
              }}
            />
          </div>

          {/* Upload area */}
          <div
            className="upload-zone"
            style={{
              background: "#080808",
              border: "1px dashed #252525",
              borderRadius: 16,
              padding: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <p style={{ fontSize: 13, color: "#ccc", fontWeight: 500 }}>Upload audio or video</p>
                <p style={{ marginTop: 4, fontSize: 11, color: "#444" }}>
                  mp3 · wav · m4a · mp4 · mov &nbsp;·&nbsp; max 10 min
                </p>
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                style={{
                  background: "#f0f0f0",
                  color: "#080808",
                  border: "none",
                  borderRadius: 12,
                  padding: "8px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "'DM Mono', monospace",
                  flexShrink: 0,
                }}
              >
                Choose
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".mp3,.wav,.m4a,.mp4,.mov"
                style={{ display: "none" }}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>

            {file && (
              <div
                className="fade-up"
                style={{
                  marginTop: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "#111",
                  border: "1px solid #2a2a2a",
                  borderRadius: 10,
                  padding: "8px 12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14 }}>🎵</span>
                  <span style={{ fontSize: 12, color: "#ccc", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {file.name}
                  </span>
                </div>
                <button
                  onClick={reset}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#555",
                    fontSize: 11,
                    padding: "2px 6px",
                  }}
                >
                  Clear ✕
                </button>
              </div>
            )}
          </div>

          {/* CTA */}
          <button
            onClick={run}
            disabled={!canAnalyze}
            style={{
              marginTop: 16,
              width: "100%",
              padding: "15px",
              borderRadius: 16,
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "'DM Mono', monospace",
              letterSpacing: "0.04em",
              cursor: canAnalyze ? "pointer" : "not-allowed",
              border: "none",
              background: canAnalyze ? "#f0f0f0" : "#111",
              color: canAnalyze ? "#080808" : "#444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "background 0.2s, color 0.2s",
            }}
          >
            {phase === "idle" && "Analyze Conversation"}
            {phase === "transcribing" && (
              <>
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    border: "2px solid #33333388",
                    borderTopColor: "#888",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                Transcribing...
              </>
            )}
            {phase === "analyzing" && (
              <>
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    border: "2px solid #33333388",
                    borderTopColor: "#888",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                Analyzing...
              </>
            )}
            {phase === "done" && "✓ Analysis Complete"}
          </button>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

          {/* Progress steps */}
          <ProgressSteps phase={phase} />

          {/* ── RESULTS ── */}
          {phase === "done" && result && (
            <div className="fade-up">
              {/* Overall score */}
              {typeof result.overall_score === "number" && (
                <div
                  style={{
                    marginTop: 24,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "#111",
                    border: "1px solid #1e1e1e",
                    borderRadius: 16,
                    padding: "16px 20px",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>
                      Overall Score
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "'Fraunces', serif", color: "#f5f5f5" }}>
                      {result.overall_score}
                      <span style={{ fontSize: 16, color: "#444", fontFamily: "'DM Mono', monospace" }}>/10</span>
                    </div>
                  </div>

                  {/* mini score pills */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                    {[
                      { label: "Clarity", val: result.clarity_score, color: "#4caf82" },
                      { label: "Discovery", val: result.discovery_score, color: "#a78bfa" },
                      { label: "Rapport", val: result.rapport_score, color: "#4f8ef7" },
                    ].filter(s => s.val != null).map((s) => (
                      <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 10, color: "#555" }}>{s.label}</span>
                        <div
                          style={{
                            width: 60,
                            height: 4,
                            borderRadius: 99,
                            background: "#1e1e1e",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${(s.val / 10) * 100}%`,
                              background: s.color,
                              borderRadius: 99,
                            }}
                          />
                        </div>
                        <span style={{ fontSize: 10, color: s.color, width: 16, textAlign: "right" }}>{s.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Swipe cards */}
              <SwipeCards analysis={result} />

              {/* Analyze new */}
              <button
                onClick={reset}
                style={{
                  marginTop: 20,
                  width: "100%",
                  padding: "13px",
                  borderRadius: 14,
                  background: "transparent",
                  color: "#555",
                  fontSize: 13,
                  border: "1px solid #1e1e1e",
                  cursor: "pointer",
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                ← Analyze a new conversation
              </button>
            </div>
          )}
        </section>

        {/* ── HOW IT WORKS ── */}
        {phase === "idle" && !file && (
          <div className="fade-up" style={{ marginTop: 28 }}>
            <div
              style={{
                fontSize: 10,
                color: "#444",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                marginBottom: 14,
              }}
            >
              How it works
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { step: "01", text: "Upload or record your real estate conversation" },
                { step: "02", text: "AI transcribes and analyzes your technique" },
                { step: "03", text: "Get specific coaching on what to improve" },
              ].map((item) => (
                <div
                  key={item.step}
                  style={{
                    display: "flex",
                    gap: 14,
                    alignItems: "flex-start",
                    background: "#0d0d0d",
                    border: "1px solid #1a1a1a",
                    borderRadius: 14,
                    padding: "12px 14px",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 11,
                      color: "#333",
                      flexShrink: 0,
                      paddingTop: 1,
                    }}
                  >
                    {item.step}
                  </span>
                  <span style={{ fontSize: 13, color: "#666", lineHeight: 1.5 }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}