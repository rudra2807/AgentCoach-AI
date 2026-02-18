// frontend/app/api/roleplay/analyze-session/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getSession } from "@/app/lib/roleplay/sessionStore";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 },
      );
    }

    const { sessionId } = await req.json();
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const openai = new OpenAI({ apiKey });

    const turnAnalyses = session.turnAnalyses ?? [];

    /* ---------------------------------------------------
       1️⃣ Deterministic Numeric Aggregation
    ---------------------------------------------------- */

    const avg = (arr: number[]) =>
      arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

    const pushinessAvg = avg(
      turnAnalyses.map((t) => t.analysis.pushiness_score ?? 0),
    );

    const clarityAvg = avg(
      turnAnalyses.map((t) => t.analysis.clarity_score ?? 0),
    );

    const discoveryAvg = avg(
      turnAnalyses.map((t) => t.analysis.discovery_score ?? 0),
    );

    const overallScore = Math.round(
      (clarityAvg * 0.3 + discoveryAvg * 0.4 + (1 - pushinessAvg) * 0.3) * 100,
    );

    /* ---------------------------------------------------
       2️⃣ Prepare Transcript For LLM Insight
    ---------------------------------------------------- */

    const transcript = session.messages
      .map((m) => `${m.role}: ${m.text}`)
      .join("\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `
You are an expert real estate sales coach evaluating a full roleplay session.

You will receive:
- The full transcript
- Numeric metrics derived from structured turn analysis

Your job:
1. Identify major strengths
2. Identify key mistakes
3. Identify missed opportunities
4. Identify the riskiest moment
5. Identify the best moment
6. Provide a concise coaching summary

Be specific and actionable.

Return ONLY valid JSON in EXACT format:

{
  "strengths": [],
  "key_mistakes": [],
  "missed_opportunities": [],
  "risk_moment": "",
  "best_moment": "",
  "biggest_improvement_area": "",
  "coaching_summary": "",
  "confidence": 0.0
}

Confidence must be between 0.3 and 0.95.
`.trim(),
        },
        {
          role: "user",
          content: `
Numeric Metrics:
overall_score: ${overallScore}
clarity_avg: ${clarityAvg.toFixed(2)}
discovery_avg: ${discoveryAvg.toFixed(2)}
pushiness_avg: ${pushinessAvg.toFixed(2)}

Transcript:
${transcript}
`.trim(),
        },
      ],
    });

    const raw = completion.choices[0].message.content;
    if (!raw) throw new Error("Empty LLM response");

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}$/);
      if (!match) throw new Error("Invalid JSON from session analyzer");
      parsed = JSON.parse(match[0]);
    }

    parsed.confidence = clampConfidence(parsed.confidence);

    /* ---------------------------------------------------
       3️⃣ Final Structured Output
    ---------------------------------------------------- */

    return NextResponse.json({
      overall_score: overallScore,
      clarity_score: Math.round(clarityAvg * 100),
      discovery_score: Math.round(discoveryAvg * 100),
      pushiness_score: Math.round(pushinessAvg * 100),

      strengths: parsed.strengths ?? [],
      key_mistakes: parsed.key_mistakes ?? [],
      missed_opportunities: parsed.missed_opportunities ?? [],
      risk_moment: parsed.risk_moment ?? "",
      best_moment: parsed.best_moment ?? "",
      biggest_improvement_area: parsed.biggest_improvement_area ?? "",
      coaching_summary: parsed.coaching_summary ?? "",
      confidence: parsed.confidence,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Analyze-session failed" },
      { status: 500 },
    );
  }
}

function clampConfidence(value: any) {
  const n = Number(value);
  if (isNaN(n)) return 0.7;
  return Math.max(0.3, Math.min(0.95, n));
}
