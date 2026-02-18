// frontend/app/api/roleplay/analyze-turn/route.ts
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

    const { stageId, lastCustomerMessage, agentMessage, signals } =
      await req.json();

    if (!stageId || !lastCustomerMessage || !agentMessage) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `
You are an expert real estate sales coach evaluating a single agent response in a roleplay training simulator.

Your job is to analyze the AGENT's response only.

Be strict, professional, and specific.

Evaluation focus:
1. Did the agent directly answer the customer's last question?
2. Did the agent acknowledge the customer's concern?
3. Did the agent align with the objective of the current stage?
4. Did the agent introduce pressure, urgency, or premature closing?
5. What was missing?
6. What would have been a stronger response?

Scoring guidance (0.0 to 1.0):
- pushiness_score: higher = more pushy
- clarity_score: higher = clearer
- discovery_score: higher = better questioning and exploration

Stage Objectives:
2 = Discover motivation and timeline
3 = Clarify budget, constraints, readiness
4 = Handle objections calmly without pressure
5 = Demonstrate value vs alternatives
6 = Secure or guide next steps

Rules:
- Use ONLY provided context.
- Do NOT invent new facts.
- Be concise.
- Return ONLY valid JSON.
- confidence must be between 0.3 and 0.95.

Return JSON in EXACT format:

{
  "answered_customer_question": true,
  "acknowledged_concern": false,
  "stage_alignment": "strong | acceptable | weak",
  "strengths": [],
  "missed_opportunities": [],
  "pushiness_score": 0.0,
  "clarity_score": 0.0,
  "discovery_score": 0.0,
  "suggested_improvement": "",
  "confidence": 0.0
}
`.trim(),
        },
        {
          role: "user",
          content: `
Current stage: ${stageId}

Customer message:
"${lastCustomerMessage}"

Agent response:
"${agentMessage}"

Known signals:
${JSON.stringify(signals ?? {}, null, 2)}
`.trim(),
        },
      ],
    });

    const raw = completion.choices[0].message.content;
    if (!raw) throw new Error("Empty response from OpenAI");

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}$/);
      if (!match) throw new Error("Invalid JSON from analyzer");
      parsed = JSON.parse(match[0]);
    }

    // Safety clamps
    parsed.pushiness_score = clampScore(parsed.pushiness_score);
    parsed.clarity_score = clampScore(parsed.clarity_score);
    parsed.discovery_score = clampScore(parsed.discovery_score);
    parsed.confidence = clampConfidence(parsed.confidence);

    return NextResponse.json(parsed);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Analyze-turn failed" },
      { status: 500 },
    );
  }
}

function clampScore(value: any) {
  const n = Number(value);
  if (isNaN(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

function clampConfidence(value: any) {
  const n = Number(value);
  if (isNaN(n)) return 0.7;
  return Math.max(0.3, Math.min(0.95, n));
}
