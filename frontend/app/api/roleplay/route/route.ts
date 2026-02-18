import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

type ChatMsg = { role: "Customer" | "Agent"; text: string };

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 },
      );
    }

    const { stageId, messages, remainingUtteranceHints } =
      (await req.json()) as {
        stageId: number;
        messages: ChatMsg[];
        remainingUtteranceHints?: Array<{
          id: string;
          stage_id: number;
          tags?: string[];
          text: string;
        }>;
      };

    if (!stageId || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Missing stageId or messages[]" },
        { status: 400 },
      );
    }

    // Keep payload small: only last ~10 turns
    const recent = messages.slice(-10);

    // Optional: give the router a short view of available moves (not the whole script)
    const hintText = remainingUtteranceHints?.length
      ? remainingUtteranceHints
          .slice(0, 25)
          .map(
            (u) =>
              `- id=${u.id} stage=${u.stage_id} tags=${(u.tags ?? []).join(",")} text="${u.text}"`,
          )
          .join("\n")
      : "(not provided)";

    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // cheaper + fast for routing; swap to gpt-4o if you want
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: `
You are a routing/classification engine for a real-estate roleplay training simulator.

You DO NOT generate the next customer message.
You ONLY classify the latest agent response and emit a structured JSON signal for the engine.

The engine controls stage transitions. You do not.

Inputs:
- Current stage number
- Recent conversation (Customer + Agent messages)

Your job:
1) Evaluate the agent's response quality.
2) Detect any hard escalation trigger.
3) Indicate whether the conversation is ready to stay, advance, or escalate.
4) Provide a bounded progress delta score.
5) Extract ONLY factual signals explicitly present in the conversation.

Rules:
- Use ONLY information explicitly stated in the chat.
- Do NOT invent new facts.
- Do NOT assume budget, timeline, or objections unless clearly stated.
- Output MUST be valid JSON.
- No markdown.
- No explanation outside JSON.
- "reason" must be a single clear sentence.
- "confidence" must be between 0.3 and 0.95.
- stage_progress_delta MUST be between -20 and +40.

Agent labels:
- acknowledged: validates customer point and continues appropriately
- good_discovery: asks specific, relevant follow-up tied to last customer message
- neutral: generic or surface-level response
- unclear: confusing, repetitive, or low-value
- pushy: introduces urgency, pressure, or ignores hesitation
- pushed_listings: suggests tours/showings/listings before sufficient discovery

Triggers (only set when clearly present):
- "agent_pushes_listings_early"
- "agent_pushes_offer_or_pressure"

progress_signal:
- "escalate" if trigger is set
- "advance" if agent handled the moment well AND stage objective appears satisfied
- "stay" otherwise

stage_progress_delta guidance:
+30 to +40 → strong discovery + direct answer + clear forward movement
+15 to +25 → solid acknowledgment + constructive continuation
0 to +10 → neutral
-10 to -20 → pressure, ignoring concern, friction

Never output values outside allowed bounds.

Return JSON in EXACT format:
{
  "agent_label": "acknowledged | pushed_listings | neutral | good_discovery | pushy | unclear",
  "trigger": null,
  "progress_signal": "stay",
  "stage_progress_delta": 0,
  "extracted_signals": {
    "timeline_months": null,
    "budget": null,
    "needs": [],
    "objections": [],
    "research_mode": "online_browsing | agent_led | open_houses | unknown",
    "value_frame_trigger": false,
    "readiness": "early | active | urgent | unknown",
    "confidence": 0.5
  },
  "reason": ""
}
`.trim(),
        },
        {
          role: "user",
          content: `
Current stage: ${stageId}

Recent chat:
${recent.map((m) => `${m.role}: ${m.text}`).join("\n")}

Remaining utterance hints (optional subset):
${hintText}
          `.trim(),
        },
      ],
    });

    const raw = completion.choices[0].message.content;
    if (!raw) throw new Error("Empty response from OpenAI");

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      const jsonMatch = raw.match(/\{[\s\S]*\}$/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      else throw new Error("Model output is not valid JSON");
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Routing failed" }, { status: 500 });
  }
}
