// frontend/app/api/roleplay/analyze-session/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const SCORING_PROMPT = `
You are an expert real estate sales coach evaluating a roleplay session transcript.

Score the agent (YOU) across these 6 categories. Each score is 0–100:

1. Conversation Control (max 15 pts)
   - Did the agent guide the conversation with purpose?
   - Did they set an agenda, manage pace, and avoid rambling?

2. Emotional Calibration (max 15 pts)
   - Did the agent match the buyer's emotional state?
   - Did they show empathy, read hesitation, and adjust tone accordingly?

3. Market Intelligence (max 20 pts)
   - Did the agent demonstrate knowledge of the market, pricing, or inventory?
   - Did they use data or insights to build credibility?

4. Authority & Confidence (max 20 pts)
   - Did the agent speak with conviction?
   - Did they avoid filler language, over-apologizing, or seeming uncertain?

5. Objection Handling (max 20 pts)
   - Did the agent address concerns directly without being dismissive?
   - Did they reframe objections into opportunities?

6. Strategic Close (max 10 pts)
   - Did the agent move toward a next step, commitment, or appointment?
   - Did they create urgency without being pushy?

Also identify:
- Top 3 strengths (specific moments or behaviors)
- Top 3 key mistakes (specific moments or behaviors)  
- Top 3 missed opportunities
- The single riskiest moment
- The single best moment
- The biggest improvement area
- A 3–4 sentence coaching summary that is direct, actionable, and encouraging

Return ONLY valid JSON in this exact format, no markdown:
{
  "scores": {
    "conversation_control": 0,
    "emotional_calibration": 0,
    "market_intelligence": 0,
    "authority_confidence": 0,
    "objection_handling": 0,
    "strategic_close": 0
  },
  "strengths": ["", "", ""],
  "key_mistakes": ["", "", ""],
  "missed_opportunities": ["", "", ""],
  "risk_moment": "",
  "best_moment": "",
  "biggest_improvement_area": "",
  "coaching_summary": ""
}

Score ranges per category:
- conversation_control: 0–15
- emotional_calibration: 0–15
- market_intelligence: 0–20
- authority_confidence: 0–20
- objection_handling: 0–20
- strategic_close: 0–10

Be strict but fair. A score of 70+ should feel earned.
If the transcript is very short or empty, give low scores and note the session was too brief to evaluate properly.
`.trim();

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 },
      );
    }

    const body = await req.json();
    const transcript: string = body.transcript ?? "";

    if (!transcript.trim()) {
      return NextResponse.json(
        { error: "No transcript provided" },
        { status: 400 },
      );
    }

    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SCORING_PROMPT },
        {
          role: "user",
          content: `Evaluate this real estate agent roleplay transcript:\n\n${transcript}`,
        },
      ],
    });

    const raw = completion.choices[0].message.content;
    if (!raw) throw new Error("Empty LLM response");

    const parsed = JSON.parse(raw);
    const s = parsed.scores ?? {};

    // Clamp each score to its allowed max
    const conversationControl = clamp(s.conversation_control ?? 0, 0, 15);
    const emotionalCalibration = clamp(s.emotional_calibration ?? 0, 0, 15);
    const marketIntelligence = clamp(s.market_intelligence ?? 0, 0, 20);
    const authorityConfidence = clamp(s.authority_confidence ?? 0, 0, 20);
    const objectionHandling = clamp(s.objection_handling ?? 0, 0, 20);
    const strategicClose = clamp(s.strategic_close ?? 0, 0, 10);

    const overallScore =
      conversationControl +
      emotionalCalibration +
      marketIntelligence +
      authorityConfidence +
      objectionHandling +
      strategicClose;

    return NextResponse.json({
      // Overall (0–100)
      overall_score: overallScore,

      // Category scores
      scores: {
        conversation_control: conversationControl,
        emotional_calibration: emotionalCalibration,
        market_intelligence: marketIntelligence,
        authority_confidence: authorityConfidence,
        objection_handling: objectionHandling,
        strategic_close: strategicClose,
      },

      // Category maxes (useful for rendering % bars in UI)
      score_maxes: {
        conversation_control: 15,
        emotional_calibration: 15,
        market_intelligence: 20,
        authority_confidence: 20,
        objection_handling: 20,
        strategic_close: 10,
      },

      // Qualitative insights
      strengths: parsed.strengths ?? [],
      key_mistakes: parsed.key_mistakes ?? [],
      missed_opportunities: parsed.missed_opportunities ?? [],
      risk_moment: parsed.risk_moment ?? "",
      best_moment: parsed.best_moment ?? "",
      biggest_improvement_area: parsed.biggest_improvement_area ?? "",
      coaching_summary: parsed.coaching_summary ?? "",
    });
  } catch (err: any) {
    console.error("[analyze-session]", err);
    return NextResponse.json(
      { error: err?.message ?? "Analyze-session failed" },
      { status: 500 },
    );
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}
