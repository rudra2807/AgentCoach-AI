import { NextResponse } from "next/server";
import OpenAI from "openai";

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

    const body = await req.json();
    const transcript: string = body.transcript ?? "";
    const jdText: string = body.jd_text ?? "";
    const interviewType: string = body.interviewType ?? "Behavioral";

    if (!transcript.trim()) {
      return NextResponse.json({
        overall_score: 0,
        scores: { answer_clarity: 0, role_relevance: 0, storytelling_quality: 0, technical_accuracy: 0, handling_pressure: 0, strategic_close: 0 },
        score_maxes: { answer_clarity: 15, role_relevance: 20, storytelling_quality: 15, technical_accuracy: 20, handling_pressure: 20, strategic_close: 10 },
        strengths: [],
        key_mistakes: [],
        missed_opportunities: [],
        risk_moment: "",
        best_moment: "",
        biggest_improvement_area: "Complete at least one exchange before ending the session.",
        coaching_summary: "No transcript was captured. Make sure your microphone is allowed in the browser and that you speak during the session before clicking End & Analyze.",
      });
    }

    const scoringPrompt = `
You are an expert interview coach evaluating a mock interview session transcript.

Job Description context:
${jdText || "Not provided"}

Interview Type: ${interviewType}

Score the CANDIDATE (labeled "You:" in the transcript) across these 6 categories:

1. Answer Clarity (max 15 pts)
   - Were answers clear, structured, and free of rambling?
   - Did the candidate get to the point efficiently?

2. Role Relevance (max 20 pts)
   - Did answers directly address the requirements of the job description?
   - Were examples and skills aligned with what the role demands?

3. Storytelling Quality (max 15 pts)
   - For behavioral questions: did the candidate use the STAR framework?
   - Were examples concrete, specific, and compelling?

4. Technical Accuracy (max 20 pts)
   - Were technical facts and claims correct?
   - Did the candidate demonstrate genuine depth of knowledge for this role?

5. Handling Pressure (max 20 pts)
   - Did the candidate stay composed under follow-up or challenging questions?
   - Did they handle pushback confidently without becoming defensive?

6. Strategic Close (max 10 pts)
   - Did the candidate ask smart questions?
   - Did they express clear interest and reinforce their fit for the role?

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
    "answer_clarity": 0,
    "role_relevance": 0,
    "storytelling_quality": 0,
    "technical_accuracy": 0,
    "handling_pressure": 0,
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
- answer_clarity: 0–15
- role_relevance: 0–20
- storytelling_quality: 0–15
- technical_accuracy: 0–20
- handling_pressure: 0–20
- strategic_close: 0–10

Be strict but fair. A score of 70+ should feel earned.
If the transcript is very short or empty, give low scores and note the session was too brief to evaluate properly.
`.trim();

    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: scoringPrompt },
        {
          role: "user",
          content: `Evaluate this mock interview transcript:\n\n${transcript}`,
        },
      ],
    });

    const raw = completion.choices[0].message.content;
    if (!raw) throw new Error("Empty LLM response");

    const parsed = JSON.parse(raw);
    const s = parsed.scores ?? {};

    const answerClarity      = clamp(s.answer_clarity      ?? 0, 0, 15);
    const roleRelevance      = clamp(s.role_relevance       ?? 0, 0, 20);
    const storytellingQuality = clamp(s.storytelling_quality ?? 0, 0, 15);
    const technicalAccuracy  = clamp(s.technical_accuracy   ?? 0, 0, 20);
    const handlingPressure   = clamp(s.handling_pressure    ?? 0, 0, 20);
    const strategicClose     = clamp(s.strategic_close      ?? 0, 0, 10);

    const overallScore =
      answerClarity +
      roleRelevance +
      storytellingQuality +
      technicalAccuracy +
      handlingPressure +
      strategicClose;

    return NextResponse.json({
      overall_score: overallScore,
      scores: {
        answer_clarity:       answerClarity,
        role_relevance:       roleRelevance,
        storytelling_quality: storytellingQuality,
        technical_accuracy:   technicalAccuracy,
        handling_pressure:    handlingPressure,
        strategic_close:      strategicClose,
      },
      score_maxes: {
        answer_clarity:       15,
        role_relevance:       20,
        storytelling_quality: 15,
        technical_accuracy:   20,
        handling_pressure:    20,
        strategic_close:      10,
      },
      strengths:                 parsed.strengths                ?? [],
      key_mistakes:              parsed.key_mistakes             ?? [],
      missed_opportunities:      parsed.missed_opportunities     ?? [],
      risk_moment:               parsed.risk_moment              ?? "",
      best_moment:               parsed.best_moment              ?? "",
      biggest_improvement_area:  parsed.biggest_improvement_area ?? "",
      coaching_summary:          parsed.coaching_summary         ?? "",
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
