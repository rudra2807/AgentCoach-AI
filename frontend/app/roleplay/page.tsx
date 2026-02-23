"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
type Phase = "idle" | "connecting" | "live" | "ending" | "done";

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function pad(n: number) {
  return String(n).padStart(2, "0");
}
function formatTime(s: number) {
  const m = Math.floor(s / 60);
  return `${pad(m)}:${pad(s % 60)}`;
}

/* ─────────────────────────────────────────────
   WAVEFORM – animated SVG bars
───────────────────────────────────────────── */
function Waveform({ active, speaking }: { active: boolean; speaking: boolean }) {
  const bars = 28;
  return (
    <div
      className="waveform"
      aria-hidden
      style={{
        display: "flex",
        alignItems: "center",
        gap: 3,
        height: 56,
      }}
    >
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className="wave-bar"
          style={
            {
              "--i": i,
              "--bars": bars,
              animationPlayState: active && speaking ? "running" : "paused",
              opacity: active ? 1 : 0.2,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   CATEGORY BAR — replaces ScoreRing
───────────────────────────────────────────── */
function CategoryBar({
  label,
  value,
  max,
  color,
  delay = 0,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  delay?: number;
}) {
  const [animated, setAnimated] = useState(false);
  const safeValue = typeof value === "number" && !isNaN(value) ? value : 0;
  const pct = animated ? Math.round((safeValue / max) * 100) : 0;

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 11, color: "#888", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {label}
        </span>
        <span style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: color }}>
          {safeValue}
          <span style={{ color: "#444", fontSize: 10 }}>/{max}</span>
        </span>
      </div>
      <div style={{ height: 6, background: "#1e1e1e", borderRadius: 99, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: color,
            borderRadius: 99,
            transition: "width 1s cubic-bezier(.4,0,.2,1)",
            boxShadow: `0 0 8px ${color}55`,
          }}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ANALYSIS SHEET — updated for new API shape
───────────────────────────────────────────── */
function AnalysisSheet({ analysis, onClose }: { analysis: any; onClose: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, []);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 350);
  }

  const scores = analysis.scores ?? {};
  const maxes = analysis.score_maxes ?? {
    conversation_control: 15,
    emotional_calibration: 15,
    market_intelligence: 20,
    authority_confidence: 20,
    objection_handling: 20,
    strategic_close: 10,
  };

  const categories = [
    { key: "conversation_control", label: "Conversation Control", color: "#4f8ef7" },
    { key: "emotional_calibration", label: "Emotional Calibration", color: "#4caf82" },
    { key: "market_intelligence", label: "Market Intelligence", color: "#f59e0b" },
    { key: "authority_confidence", label: "Authority & Confidence", color: "#a78bfa" },
    { key: "objection_handling", label: "Objection Handling", color: "#f87171" },
    { key: "strategic_close", label: "Strategic Close", color: "#38bdf8" },
  ];

  const safeOverall = typeof analysis.overall_score === "number" && !isNaN(analysis.overall_score)
    ? analysis.overall_score
    : 0;

  // Overall score color
  const overallColor = safeOverall >= 75 ? "#4caf82" : safeOverall >= 50 ? "#f59e0b" : "#f87171";

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && handleClose()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: visible ? "rgba(0,0,0,0.72)" : "rgba(0,0,0,0)",
        backdropFilter: "blur(6px)",
        transition: "background 0.35s",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 680,
          maxHeight: "92vh",
          overflowY: "auto",
          background: "#0d0d0d",
          borderTop: "1px solid #2a2a2a",
          borderLeft: "1px solid #2a2a2a",
          borderRight: "1px solid #2a2a2a",
          borderRadius: "24px 24px 0 0",
          padding: "28px 24px 48px",
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.38s cubic-bezier(.32,1.2,.4,1)",
        }}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, background: "#333", borderRadius: 99, margin: "0 auto 24px" }} />

        {/* Close */}
        <button
          onClick={handleClose}
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            background: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: 99,
            color: "#aaa",
            fontSize: 12,
            padding: "5px 12px",
            cursor: "pointer",
            fontFamily: "'DM Mono', monospace",
          }}
        >
          Close ✕
        </button>

        <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4, fontFamily: "'DM Mono', monospace" }}>
          Performance Review
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f0f0f0", marginBottom: 24, fontFamily: "'Fraunces', serif" }}>
          Session Analysis
        </h2>

        {/* Overall score hero */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            background: "#111",
            border: `1px solid ${overallColor}22`,
            borderRadius: 20,
            padding: "20px 24px",
            marginBottom: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4, fontFamily: "'DM Mono', monospace" }}>
              Overall Score
            </div>
            <div style={{ fontSize: 48, fontWeight: 700, fontFamily: "'Fraunces', serif", color: overallColor, lineHeight: 1 }}>
              {safeOverall}
              <span style={{ fontSize: 20, color: "#333", fontFamily: "'DM Mono', monospace" }}>/100</span>
            </div>
          </div>
          {analysis.biggest_improvement_area && (
            <div
              style={{
                flex: 1,
                background: "#0d0d0d",
                border: "1px solid #1e1e1e",
                borderRadius: 14,
                padding: "12px 14px",
              }}
            >
              <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4, fontFamily: "'DM Mono', monospace" }}>
                Focus Area
              </div>
              <div style={{ fontSize: 12, color: "#ccc", lineHeight: 1.5 }}>
                {analysis.biggest_improvement_area}
              </div>
            </div>
          )}
        </div>

        {/* Category bars */}
        <div
          style={{
            background: "#111",
            border: "1px solid #1e1e1e",
            borderRadius: 20,
            padding: "20px",
            marginBottom: 16,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {categories.map((cat, i) => (
            <CategoryBar
              key={cat.key}
              label={cat.label}
              value={scores[cat.key] ?? 0}
              max={maxes[cat.key]}
              color={cat.color}
              delay={i * 100}
            />
          ))}
        </div>

        {/* Best & Risk moments */}
        {(analysis.best_moment || analysis.risk_moment) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            {analysis.best_moment && (
              <div style={{ background: "#0a1a10", border: "1px solid #4caf8222", borderRadius: 16, padding: "14px" }}>
                <div style={{ fontSize: 10, color: "#4caf82", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6, fontFamily: "'DM Mono', monospace" }}>
                  ✦ Best Moment
                </div>
                <p style={{ fontSize: 12, color: "#ccc", lineHeight: 1.5, margin: 0 }}>{analysis.best_moment}</p>
              </div>
            )}
            {analysis.risk_moment && (
              <div style={{ background: "#1a0a0a", border: "1px solid #f8717122", borderRadius: 16, padding: "14px" }}>
                <div style={{ fontSize: 10, color: "#f87171", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6, fontFamily: "'DM Mono', monospace" }}>
                  ✧ Risky Moment
                </div>
                <p style={{ fontSize: 12, color: "#ccc", lineHeight: 1.5, margin: 0 }}>{analysis.risk_moment}</p>
              </div>
            )}
          </div>
        )}

        {/* Insight panels */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <InsightPanel title="✦ Strengths" items={analysis.strengths} accent="#4caf82" bg="#0a1a10" />
          <InsightPanel title="✧ Key Mistakes" items={analysis.key_mistakes} accent="#f87171" bg="#1a0a0a" />
          <InsightPanel title="◈ Missed Opportunities" items={analysis.missed_opportunities} accent="#f59e0b" bg="#1a1400" />
          <CoachingPanel content={analysis.coaching_summary} />
        </div>
      </div>
    </div>
  );
}

function InsightPanel({ title, items, accent, bg }: { title: string; items: string[]; accent: string; bg: string }) {
  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${accent}22`,
        borderRadius: 16,
        padding: "16px 18px",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, color: accent, marginBottom: 10, letterSpacing: "0.04em" }}>
        {title}
      </div>
      {items && items.length > 0 ? (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((item, i) => (
            <li key={i} style={{ fontSize: 13, color: "#ccc", lineHeight: 1.5, display: "flex", gap: 8 }}>
              <span style={{ color: accent, flexShrink: 0 }}>—</span>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <div style={{ fontSize: 13, color: "#555" }}>None detected.</div>
      )}
    </div>
  );
}

function CoachingPanel({ content }: { content: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        background: "#111",
        border: "1px solid #2a2a2a",
        borderRadius: 16,
        padding: "16px 18px",
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          background: "none",
          border: "none",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: 0,
          color: "#e0e0e0",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.04em",
        }}
      >
        <span>◎ Coaching Summary</span>
        <span
          style={{
            color: "#555",
            fontSize: 11,
            fontFamily: "'DM Mono', monospace",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
            display: "inline-block",
          }}
        >
          ▾
        </span>
      </button>

      <div
        style={{
          maxHeight: open ? 400 : 0,
          overflow: "hidden",
          transition: "max-height 0.35s cubic-bezier(.4,0,.2,1)",
        }}
      >
        <div style={{ marginTop: 12, fontSize: 13, color: "#aaa", lineHeight: 1.7 }}>
          {content}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function RoleplayPage() {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("idle");
  const [speaking, setSpeaking] = useState(false); // crude toggle for viz
  const [elapsed, setElapsed] = useState(0);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [transcriptLines, setTranscriptLines] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const transcriptRef = useRef<string[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const started = phase !== "idle" && phase !== "done";

  /* timer */
  useEffect(() => {
    if (phase === "live") {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (phase === "idle" || phase === "done") setElapsed(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  /* speaking detection via analyser */
  function setupSpeakingDetection(stream: MediaStream) {
    try {
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyzer = ctx.createAnalyser();
      analyzer.fftSize = 256;
      src.connect(analyzer);
      analyzerRef.current = analyzer;

      const buf = new Uint8Array(analyzer.frequencyBinCount);
      function tick() {
        analyzer.getByteFrequencyData(buf);
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
        setSpeaking(avg > 8);
        animFrameRef.current = requestAnimationFrame(tick);
      }
      animFrameRef.current = requestAnimationFrame(tick);
    } catch { }
  }

  async function startVoice() {
    setPhase("connecting");
    setTranscriptLines([]);
    transcriptRef.current = [];
    setAnalysis(null);
    setElapsed(0);

    try {
      const tokenRes = await fetch("/api/roleplay/realtime-token", { method: "POST" });
      const tokenData = await tokenRes.json();

      setSessionId(crypto.randomUUID());

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });

      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      setupSpeakingDetection(stream);

      const audioEl = new Audio();
      audioEl.autoplay = true;
      audioRef.current = audioEl;

      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") setPhase("live");
        else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          setPhase("idle");
        }
      };

      const dc = pc.createDataChannel("oai-events");

      dc.onopen = () => {
        // 1. Enable input transcription so YOUR voice gets captured
        dc.send(JSON.stringify({
          type: "session.update",
          session: {
            input_audio_transcription: {
              model: "whisper-1",
            },
          },
        }));

        // 2. Kick off the buyer's opening line
        dc.send(JSON.stringify({
          type: "response.create",
          response: {
            instructions: "Start the conversation as a cautious home buyer browsing homes but unsure about timing.",
          },
        }));
      };

      dc.onmessage = (event) => {
        let msg: any;
        try { msg = JSON.parse(event.data); } catch { return; }

        // YOUR voice (agent) — fires after Whisper processes each utterance
        if (
          msg.type === "conversation.item.input_audio_transcription.completed" &&
          msg.transcript
        ) {
          const line = `Agent: ${msg.transcript.trim()}`;
          transcriptRef.current.push(line);
          setTranscriptLines((p) => [...p, line]);
        }

        // AI buyer voice — delta builds up the text, .done has the full turn
        if (msg.type === "response.audio_transcript.done" && msg.transcript) {
          const line = `Buyer: ${msg.transcript.trim()}`;
          transcriptRef.current.push(line);
          setTranscriptLines((p) => [...p, line]);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-realtime";

      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.client_secret.value}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
      });

      const answer = { type: "answer", sdp: await sdpResponse.text() };
      await pc.setRemoteDescription(answer as any);
    } catch (e: any) {
      alert(e?.message ?? "Failed to start session");
      setPhase("idle");
    }
  }

  async function endRoleplay() {
    setPhase("ending");

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setSpeaking(false);

    const pc = pcRef.current;
    if (pc) {
      pc.getSenders().forEach((s) => s.track?.stop());
      pc.close();
      pcRef.current = null;
    }

    const transcript = transcriptRef.current.join("\n");

    console.log("Full transcript:", transcript);

    try {
      const res = await fetch("/api/roleplay/analyze-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const data = await res.json();
      setAnalysis(data);
      setPhase("done");
      setAnalysisOpen(true);
    } catch {
      setPhase("done");
    }
  }

  const phaseLabel: Record<Phase, string> = {
    idle: "Ready to practice",
    connecting: "Connecting...",
    live: "Live session",
    ending: "Analyzing...",
    done: "Session complete",
  };

  const phaseColor: Record<Phase, string> = {
    idle: "#555",
    connecting: "#f59e0b",
    live: "#4caf82",
    ending: "#a78bfa",
    done: "#4f8ef7",
  };

  return (
    <>
      {/* Global styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,700;1,400&family=DM+Mono:wght@400;500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body { background: #080808; }

        .wave-bar {
          width: 3px;
          border-radius: 99px;
          background: #4caf82;
          animation: wave 0.9s ease-in-out infinite alternate;
          animation-delay: calc(var(--i) * (0.9s / var(--bars)));
          min-height: 4px;
        }

        @keyframes wave {
          0%   { height: 4px; opacity: 0.4; }
          50%  { height: 36px; opacity: 0.9; }
          100% { height: 8px; opacity: 0.6; }
        }

        .pulse-ring {
          animation: pulse-ring 2s ease-out infinite;
        }
        @keyframes pulse-ring {
          0%   { transform: scale(0.95); opacity: 0.5; }
          70%  { transform: scale(1.12); opacity: 0; }
          100% { transform: scale(0.95); opacity: 0; }
        }

        .transcript-line {
          animation: slide-in 0.25s ease-out both;
        }
        @keyframes slide-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .btn-end {
          position: relative;
          overflow: hidden;
        }
        .btn-end::after {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(255,255,255,0.06);
          opacity: 0;
          transition: opacity 0.15s;
        }
        .btn-end:active::after { opacity: 1; }
      `}</style>

      <main
        style={{
          minHeight: "100dvh",
          background: "#080808",
          color: "#f0f0f0",
          fontFamily: "'DM Mono', monospace",
          display: "flex",
          flexDirection: "column",
          padding: "0 0 32px",
          maxWidth: 480,
          margin: "0 auto",
        }}
      >
        {/* ── TOP NAV ── */}
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 20px 0",
          }}
        >
          <button
            onClick={() => router.push("/")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#666",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            ← Back
          </button>

          {/* Status chip */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              background: "#111",
              border: `1px solid ${phaseColor[phase]}33`,
              borderRadius: 99,
              padding: "5px 12px",
              fontSize: 11,
              color: phaseColor[phase],
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              transition: "color 0.3s, border-color 0.3s",
            }}
          >
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: phaseColor[phase],
                transition: "background 0.3s",
                boxShadow: phase === "live" ? `0 0 8px ${phaseColor.live}` : "none",
              }}
            />
            {phaseLabel[phase]}
          </div>
        </nav>

        {/* ── HERO ── */}
        <div style={{ padding: "32px 20px 0", textAlign: "center" }}>
          <p
            style={{
              fontSize: 10,
              color: "#444",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: 8,
              fontFamily: "'DM Mono', monospace",
            }}
          >
            AgentCoach AI
          </p>
          <h1
            style={{
              fontSize: 30,
              fontFamily: "'Fraunces', serif",
              fontWeight: 700,
              color: "#f5f5f5",
              lineHeight: 1.15,
              marginBottom: 8,
            }}
          >
            Roleplay Practice
          </h1>
          <p style={{ fontSize: 12, color: "#555" }}>You're the agent. The AI plays the buyer.</p>
        </div>

        {/* ── VOICE VISUALIZER ── */}
        <div
          style={{
            margin: "40px auto 0",
            width: 200,
            height: 200,
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Pulse rings */}
          {phase === "live" && (
            <>
              <div
                className="pulse-ring"
                style={{
                  position: "absolute",
                  inset: 10,
                  borderRadius: "50%",
                  border: `1px solid ${phaseColor.live}`,
                  animationDelay: "0s",
                }}
              />
              <div
                className="pulse-ring"
                style={{
                  position: "absolute",
                  inset: 10,
                  borderRadius: "50%",
                  border: `1px solid ${phaseColor.live}`,
                  animationDelay: "0.7s",
                }}
              />
            </>
          )}

          {/* Center disc */}
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: "50%",
              background: "#101010",
              border: `2px solid ${phase === "live" ? phaseColor.live + "55" : "#1e1e1e"}`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              transition: "border-color 0.4s",
              position: "relative",
              zIndex: 1,
            }}
          >
            {phase === "idle" || phase === "done" ? (
              <div style={{ fontSize: 36 }}>🎙</div>
            ) : phase === "connecting" ? (
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  border: "3px solid #333",
                  borderTopColor: "#f59e0b",
                  animation: "spin 0.8s linear infinite",
                }}
              />
            ) : phase === "ending" ? (
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  border: "3px solid #333",
                  borderTopColor: "#a78bfa",
                  animation: "spin 0.8s linear infinite",
                }}
              />
            ) : (
              <Waveform active={phase === "live"} speaking={speaking} />
            )}

            {phase === "live" && (
              <div
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 13,
                  color: "#4caf82",
                  letterSpacing: "0.05em",
                }}
              >
                {formatTime(elapsed)}
              </div>
            )}
          </div>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>

        {/* ── CTA BUTTONS ── */}
        <div
          style={{
            padding: "32px 20px 0",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {phase === "idle" && (
            <button
              onClick={startVoice}
              style={{
                width: "100%",
                padding: "16px",
                borderRadius: 16,
                background: "#f0f0f0",
                color: "#080808",
                fontSize: 15,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                fontFamily: "'DM Mono', monospace",
                letterSpacing: "0.04em",
              }}
            >
              Start Session
            </button>
          )}

          {phase === "live" && (
            <button
              onClick={endRoleplay}
              className="btn-end"
              style={{
                width: "100%",
                padding: "16px",
                borderRadius: 16,
                background: "#1a0808",
                color: "#f87171",
                fontSize: 15,
                fontWeight: 600,
                border: "1px solid #f8717133",
                cursor: "pointer",
                fontFamily: "'DM Mono', monospace",
                letterSpacing: "0.04em",
              }}
            >
              ■ End &amp; Analyze
            </button>
          )}

          {phase === "done" && (
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setAnalysisOpen(true)}
                style={{
                  flex: 1,
                  padding: "14px",
                  borderRadius: 16,
                  background: "#111",
                  color: "#4f8ef7",
                  fontSize: 14,
                  fontWeight: 600,
                  border: "1px solid #4f8ef733",
                  cursor: "pointer",
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                View Analysis
              </button>
              <button
                onClick={() => {
                  setPhase("idle");
                  setTranscriptLines([]);
                  setAnalysis(null);
                }}
                style={{
                  flex: 1,
                  padding: "14px",
                  borderRadius: 16,
                  background: "#f0f0f0",
                  color: "#080808",
                  fontSize: 14,
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                New Session
              </button>
            </div>
          )}

          {(phase === "connecting" || phase === "ending") && (
            <button
              disabled
              style={{
                width: "100%",
                padding: "16px",
                borderRadius: 16,
                background: "#111",
                color: "#555",
                fontSize: 15,
                border: "1px solid #222",
                cursor: "not-allowed",
                fontFamily: "'DM Mono', monospace",
              }}
            >
              {phase === "connecting" ? "Connecting..." : "Analyzing session..."}
            </button>
          )}
        </div>

        {/* ── LIVE TRANSCRIPT ── */}
        {(phase === "live" || phase === "ending" || phase === "done") && transcriptLines.length > 0 && (
          <div
            style={{
              margin: "24px 20px 0",
              background: "#0d0d0d",
              border: "1px solid #1e1e1e",
              borderRadius: 18,
              padding: "16px",
              maxHeight: 220,
              overflowY: "auto",
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "#444",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Live Transcript
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {transcriptLines.map((line, i) => {
                const isAgent = line.startsWith("Agent:");
                return (
                  <div key={i} className="transcript-line" style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: isAgent ? "#4f8ef7" : "#4caf82",
                        flexShrink: 0,
                        paddingTop: 1,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}
                    >
                      {isAgent ? "You" : "Buyer"}
                    </span>
                    <span style={{ fontSize: 12, color: "#aaa", lineHeight: 1.5 }}>
                      {line.replace(/^(Agent:|Buyer:)\s*/, "")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TIPS ── */}
        {phase === "idle" && (
          <div
            style={{
              margin: "24px 20px 0",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {[
              { icon: "🏠", tip: "Ask about budget and timeline early" },
              { icon: "🤝", tip: "Build trust before pitching properties" },
              { icon: "🔍", tip: "Uncover emotional motivators" },
            ].map((t, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  background: "#0d0d0d",
                  border: "1px solid #1a1a1a",
                  borderRadius: 14,
                  padding: "12px 14px",
                }}
              >
                <span style={{ fontSize: 18 }}>{t.icon}</span>
                <span style={{ fontSize: 12, color: "#666" }}>{t.tip}</span>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Analysis bottom sheet */}
      {analysisOpen && analysis && (
        <AnalysisSheet analysis={analysis} onClose={() => setAnalysisOpen(false)} />
      )}
    </>
  );
}