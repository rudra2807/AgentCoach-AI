"use client";

import { useEffect, useRef, useState } from "react";
import type { InterviewType } from "@/app/lib/interview/types";
import { buildInterviewOpener } from "@/app/lib/interview/prompt";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
type Phase = "idle" | "connecting" | "live" | "ending" | "done";

const INTERVIEW_TYPES: InterviewType[] = [
  "Behavioral",
  "Technical",
  "System Design",
  "HR Screen",
  "PM",
];

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

function isJunkTranscript(t: string) {
  const s = (t || "").trim();
  if (!s) return true;
  if (s.length < 4) return true;
  const nonAscii = (s.match(/[^\x00-\x7F]/g) ?? []).length;
  if (nonAscii / s.length > 0.15) return true;
  const lower = s.toLowerCase();
  const bannedSingles = new Set([
    "bye", "bye.", "ok", "okay", "thanks", "thank you", "peace", "yes", "no",
  ]);
  if (bannedSingles.has(lower)) return true;
  if (/(뉴스|입니다)/.test(s)) return true;
  return false;
}

/* ─────────────────────────────────────────────
   WAVEFORM
───────────────────────────────────────────── */
function Waveform({ active, speaking }: { active: boolean; speaking: boolean }) {
  const bars = 28;
  return (
    <div
      aria-hidden
      style={{ display: "flex", alignItems: "center", gap: 3, height: 56 }}
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
   CATEGORY BAR
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
        <span style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color }}>
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
   INSIGHT PANEL
───────────────────────────────────────────── */
function InsightPanel({
  title,
  items,
  accent,
  bg,
}: {
  title: string;
  items: string[];
  accent: string;
  bg: string;
}) {
  return (
    <div style={{ background: bg, border: `1px solid ${accent}22`, borderRadius: 16, padding: "16px 18px" }}>
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

/* ─────────────────────────────────────────────
   COACHING PANEL
───────────────────────────────────────────── */
function CoachingPanel({ content }: { content: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 16, padding: "16px 18px" }}>
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
        <div style={{ marginTop: 12, fontSize: 13, color: "#aaa", lineHeight: 1.7 }}>{content}</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ANALYSIS SHEET
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
    answer_clarity: 15,
    role_relevance: 20,
    storytelling_quality: 15,
    technical_accuracy: 20,
    handling_pressure: 20,
    strategic_close: 10,
  };

  const categories = [
    { key: "answer_clarity",       label: "Answer Clarity",       color: "#4f8ef7" },
    { key: "role_relevance",       label: "Role Relevance",       color: "#4caf82" },
    { key: "storytelling_quality", label: "Storytelling Quality", color: "#f59e0b" },
    { key: "technical_accuracy",   label: "Technical Accuracy",   color: "#a78bfa" },
    { key: "handling_pressure",    label: "Handling Pressure",    color: "#f87171" },
    { key: "strategic_close",      label: "Strategic Close",      color: "#38bdf8" },
  ];

  const safeOverall =
    typeof analysis.overall_score === "number" && !isNaN(analysis.overall_score)
      ? analysis.overall_score
      : 0;
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
        <div style={{ width: 40, height: 4, background: "#333", borderRadius: 99, margin: "0 auto 24px" }} />

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
          Interview Analysis
        </h2>

        {/* Overall score */}
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
          <InsightPanel title="✦ Strengths"           items={analysis.strengths}            accent="#4caf82" bg="#0a1a10" />
          <InsightPanel title="✧ Key Mistakes"        items={analysis.key_mistakes}         accent="#f87171" bg="#1a0a0a" />
          <InsightPanel title="◈ Missed Opportunities" items={analysis.missed_opportunities} accent="#f59e0b" bg="#1a1400" />
          <CoachingPanel content={analysis.coaching_summary} />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   INTERVIEW TYPE PILLS
───────────────────────────────────────────── */
function InterviewTypePills({
  value,
  onChange,
}: {
  value: InterviewType | null;
  onChange: (v: InterviewType) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {INTERVIEW_TYPES.map((opt) => (
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
   RESUME SECTION
───────────────────────────────────────────── */
function ResumeSection({
  resumeInputMode,
  setResumeInputMode,
  resumeText,
  setResumeText,
  parsedResumeText,
  setParsedResumeText,
  isParsing,
  setIsParsing,
  disabled,
}: {
  resumeInputMode: "paste" | "upload";
  setResumeInputMode: (m: "paste" | "upload") => void;
  resumeText: string;
  setResumeText: (t: string) => void;
  parsedResumeText: string;
  setParsedResumeText: (t: string) => void;
  isParsing: boolean;
  setIsParsing: (v: boolean) => void;
  disabled: boolean;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  async function handleParsePdf() {
    if (!pdfFile) return;
    setIsParsing(true);
    setParseError(null);
    try {
      const fd = new FormData();
      fd.append("file", pdfFile);
      const res = await fetch("/api/parse-resume", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Parse failed");
      setParsedResumeText(data.text ?? "");
    } catch (e: any) {
      setParseError(e?.message ?? "Failed to parse PDF");
    } finally {
      setIsParsing(false);
    }
  }

  const toggleStyle = (active: boolean) => ({
    padding: "5px 12px",
    borderRadius: 8,
    fontSize: 11,
    fontFamily: "'DM Mono', monospace",
    cursor: "pointer",
    border: `1px solid ${active ? "#2a2a2a" : "transparent"}`,
    background: active ? "#111" : "transparent",
    color: active ? "#f0f0f0" : "#555",
    transition: "all 0.15s",
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.14em", textTransform: "uppercase" }}>
          Resume <span style={{ color: "#333" }}>(optional)</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button style={toggleStyle(resumeInputMode === "paste")} onClick={() => setResumeInputMode("paste")}>
            Paste text
          </button>
          <button style={toggleStyle(resumeInputMode === "upload")} onClick={() => setResumeInputMode("upload")}>
            Upload PDF
          </button>
        </div>
      </div>

      {resumeInputMode === "paste" ? (
        <textarea
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          disabled={disabled}
          placeholder="Paste your resume text here..."
          rows={3}
          style={{
            width: "100%",
            background: "#080808",
            border: "1px solid #252525",
            borderRadius: 12,
            padding: "10px 12px",
            fontSize: 12,
            fontFamily: "'DM Mono', monospace",
            color: "#ccc",
            resize: "vertical",
            outline: "none",
            opacity: disabled ? 0.5 : 1,
          }}
        />
      ) : (
        <div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div
              style={{
                flex: 1,
                background: "#080808",
                border: "1px solid #252525",
                borderRadius: 12,
                padding: "10px 12px",
                fontSize: 12,
                fontFamily: "'DM Mono', monospace",
                color: pdfFile ? "#ccc" : "#444",
                cursor: "pointer",
              }}
              onClick={() => fileRef.current?.click()}
            >
              {pdfFile ? pdfFile.name : "Choose PDF file..."}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,application/pdf"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setPdfFile(f);
                setParsedResumeText("");
                setParseError(null);
              }}
            />
            <button
              onClick={handleParsePdf}
              disabled={!pdfFile || isParsing || disabled}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                fontSize: 12,
                fontFamily: "'DM Mono', monospace",
                cursor: !pdfFile || isParsing || disabled ? "not-allowed" : "pointer",
                border: "none",
                background: !pdfFile || isParsing || disabled ? "#111" : "#f0f0f0",
                color: !pdfFile || isParsing || disabled ? "#444" : "#080808",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              {isParsing ? "Parsing..." : "Parse PDF"}
            </button>
          </div>

          {parsedResumeText && !parseError && (
            <div style={{ marginTop: 8, fontSize: 11, color: "#4caf82", display: "flex", alignItems: "center", gap: 6 }}>
              <span>✓ Parsed</span>
              <span style={{ color: "#444" }}>—</span>
              <span style={{ color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {parsedResumeText.slice(0, 80).trim()}…
              </span>
            </div>
          )}
          {parseError && (
            <div style={{ marginTop: 8, fontSize: 11, color: "#f87171" }}>{parseError}</div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function MockMatePage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [speaking, setSpeaking] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [transcriptLines, setTranscriptLines] = useState<string[]>([]);

  const [interviewType, setInterviewType] = useState<InterviewType | null>(null);
  const [jdText, setJdText] = useState("");
  const [jdTouched, setJdTouched] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [resumeInputMode, setResumeInputMode] = useState<"paste" | "upload">("paste");
  const [parsedResumeText, setParsedResumeText] = useState("");
  const [isParsing, setIsParsing] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const transcriptRef = useRef<string[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastYouRef = useRef<string>("");
  const dcRef = useRef<RTCDataChannel | null>(null);
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);

  const canStart =
    interviewType !== null &&
    jdText.trim().length >= 30 &&
    phase === "idle";

  const jdInvalid = jdTouched && jdText.trim().length > 0 && jdText.trim().length < 30;

  useEffect(() => {
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTo({
        top: transcriptScrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [transcriptLines]);

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
    } catch {}
  }

  async function startVoice() {
    if (!interviewType) return;
    dcRef.current = null;
    setPhase("connecting");
    setTranscriptLines([]);
    transcriptRef.current = [];
    setAnalysis(null);
    setElapsed(0);

    try {
      const tokenRes = await fetch("/api/roleplay/realtime-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jd_text: jdText,
          resume_text: parsedResumeText || resumeText,
          interviewType,
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) throw new Error(tokenData?.error ?? "Failed to create realtime session");
      if (!tokenData?.client_secret?.value) throw new Error("Missing client_secret in token response");

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
        audioEl.play().catch(console.error);
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") setPhase("live");
        else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          setPhase("idle");
        }
      };

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.onopen = () => {
        dc.send(JSON.stringify({
          type: "session.update",
          session: {
            turn_detection: {
              type: "server_vad",
              threshold: 0.7,
              silence_duration_ms: 1500,
              prefix_padding_ms: 250,
            },
            input_audio_transcription: { model: "whisper-1", language: "en" },
          },
        }));

        // Prompt the AI to open with the first question
        if (interviewType) {
          const opener = buildInterviewOpener(interviewType);
          dc.send(JSON.stringify({
            type: "response.create",
            response: {
              modalities: ["text", "audio"],
              instructions: opener,
            },
          }));
        }
      };

      dc.onmessage = (event) => {
        let msg: any;
        try { msg = JSON.parse(event.data); } catch { return; }

        // Log all event types so we can see what's arriving
        if (!["response.audio.delta", "input_audio_buffer.append"].includes(msg.type)) {
          console.log("[oai-event]", msg.type, msg);
        }

        if (
          msg.type === "conversation.item.input_audio_transcription.completed" &&
          msg.transcript
        ) {
          const t = msg.transcript.trim();
          if (isJunkTranscript(t)) return;
          if (t === lastYouRef.current) return;
          lastYouRef.current = t;
          const line = `You: ${t}`;
          transcriptRef.current.push(line);
          setTranscriptLines((p) => [...p, line]);
        }

        if (msg.type === "response.audio_transcript.done" && msg.transcript) {
          const line = `Interviewer: ${msg.transcript.trim()}`;
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

    try {
      const res = await fetch("/api/roleplay/analyze-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          jd_text: jdText,
          interviewType,
        }),
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
    idle:       "Ready to practice",
    connecting: "Connecting...",
    live:       "Interview in progress",
    ending:     "Analyzing...",
    done:       "Session complete",
  };

  const phaseColor: Record<Phase, string> = {
    idle:       "#555",
    connecting: "#f59e0b",
    live:       "#4caf82",
    ending:     "#a78bfa",
    done:       "#4f8ef7",
  };

  return (
    <>
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
          0%   { height: 4px;  opacity: 0.4; }
          50%  { height: 36px; opacity: 0.9; }
          100% { height: 8px;  opacity: 0.6; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .pulse-ring { animation: pulse-ring 2s ease-out infinite; }
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
        .btn-end { position: relative; overflow: hidden; }
        .btn-end::after {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(255,255,255,0.06);
          opacity: 0;
          transition: opacity 0.15s;
        }
        .btn-end:active::after { opacity: 1; }
        ::-webkit-scrollbar { display: none; }
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
        {/* ── TOP BAR ── */}
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            padding: "20px 20px 0",
          }}
        >
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
            MockMate
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
            Interview Practice
          </h1>
          <p style={{ fontSize: 12, color: "#555" }}>
            You&apos;re the candidate. The AI plays the interviewer.
          </p>
        </div>

        {/* ── IDLE INPUTS ── */}
        {phase === "idle" && (
          <div style={{ padding: "18px 20px 0", display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Interview Type */}
            <div>
              <div style={{ fontSize: 10, color: "#444", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
                Interview Type
              </div>
              <InterviewTypePills value={interviewType} onChange={setInterviewType} />
            </div>

            {/* Job Description */}
            <div>
              <div style={{ fontSize: 10, color: "#444", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
                Job Description <span style={{ color: "#f87171" }}>*</span>
              </div>
              <textarea
                value={jdText}
                onChange={(e) => { setJdText(e.target.value); setJdTouched(true); }}
                placeholder="Paste the job description here..."
                rows={4}
                style={{
                  width: "100%",
                  background: "#080808",
                  border: `1px solid ${jdInvalid ? "#f87171" : "#252525"}`,
                  borderRadius: 12,
                  padding: "10px 12px",
                  fontSize: 12,
                  fontFamily: "'DM Mono', monospace",
                  color: "#ccc",
                  resize: "vertical",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
              />
              {jdInvalid && (
                <div style={{ marginTop: 4, fontSize: 11, color: "#f87171" }}>
                  Paste a full job description (at least 30 characters)
                </div>
              )}
            </div>

            {/* Resume */}
            <ResumeSection
              resumeInputMode={resumeInputMode}
              setResumeInputMode={setResumeInputMode}
              resumeText={resumeText}
              setResumeText={setResumeText}
              parsedResumeText={parsedResumeText}
              setParsedResumeText={setParsedResumeText}
              isParsing={isParsing}
              setIsParsing={setIsParsing}
              disabled={false}
            />
          </div>
        )}

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
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#4caf82", letterSpacing: "0.05em" }}>
                {formatTime(elapsed)}
              </div>
            )}
          </div>
        </div>

        {/* ── CTA BUTTONS ── */}
        <div style={{ padding: "32px 20px 0", display: "flex", flexDirection: "column", gap: 12 }}>
          {phase === "idle" && (
            <button
              onClick={startVoice}
              disabled={!canStart}
              style={{
                width: "100%",
                padding: "16px",
                borderRadius: 16,
                background: canStart ? "#f0f0f0" : "#111",
                color: canStart ? "#080808" : "#444",
                fontSize: 15,
                fontWeight: 600,
                border: canStart ? "none" : "1px solid #222",
                cursor: canStart ? "pointer" : "not-allowed",
                fontFamily: "'DM Mono', monospace",
                letterSpacing: "0.04em",
                transition: "background 0.2s, color 0.2s",
              }}
            >
              {!interviewType
                ? "Select interview type to begin"
                : jdText.trim().length < 30
                ? "Add job description to begin"
                : "Start Interview"}
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
                onClick={endRoleplay}
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
                Re-Analyze
              </button>
              <button
                onClick={() => {
                  setPhase("idle");
                  setTranscriptLines([]);
                  transcriptRef.current = [];
                  setAnalysis(null);
                  lastYouRef.current = "";
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
            ref={transcriptScrollRef}
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
            <div style={{ fontSize: 10, color: "#444", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>
              Live Transcript
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {transcriptLines.map((line, i) => {
                const isYou = line.startsWith("You:");
                const label = isYou ? "You" : "Interviewer";
                return (
                  <div key={i} className="transcript-line" style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: isYou ? "#4f8ef7" : "#4caf82",
                        flexShrink: 0,
                        paddingTop: 1,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}
                    >
                      {label}
                    </span>
                    <span style={{ fontSize: 12, color: "#aaa", lineHeight: 1.5 }}>
                      {line.replace(/^(You:|Interviewer:)\s*/, "")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TIPS (idle only) ── */}
        {phase === "idle" && (
          <div style={{ margin: "24px 20px 0", display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { icon: "⭐", tip: "Use the STAR framework for behavioral questions" },
              { icon: "📋", tip: "Be specific with examples — generic answers score lower" },
              { icon: "❓", tip: "Always prepare smart questions to ask at the end" },
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

      {analysisOpen && analysis && (
        <AnalysisSheet analysis={analysis} onClose={() => setAnalysisOpen(false)} />
      )}
    </>
  );
}
