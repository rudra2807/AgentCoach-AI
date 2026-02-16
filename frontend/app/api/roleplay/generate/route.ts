// frontend/app/api/roleplay/generate/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

type ChatMsg = { role: "Customer" | "Agent"; text: string };

type GenerateReq = {
  stageId: number;
  tags: string[];
  messages: ChatMsg[];
  signals?: any;

  // NEW (optional but recommended)
  lastIntent?: string;
  reaskCounts?: Record<string, number>;
};

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const { stageId, tags, messages, signals, lastIntent, reaskCounts } =
      (await req.json()) as GenerateReq;

    if (
      typeof stageId !== "number" ||
      !Array.isArray(messages) ||
      messages.length === 0
    ) {
      return NextResponse.json(
        { error: "Missing stageId or messages[]" },
        { status: 400 }
      );
    }

    const openai = new OpenAI({ apiKey });

    const recent = messages.slice(-12);

    const lastCustomer =
      [...recent].reverse().find((m) => m.role === "Customer")?.text ?? "";
    const lastAgent =
      [...recent].reverse().find((m) => m.role === "Agent")?.text ?? "";

    const askedIntents = Array.isArray(signals?.asked_intents)
      ? (signals.asked_intents as string[])
      : [];

    const safeLastIntent = typeof lastIntent === "string" ? lastIntent : "";
    const safeReaskCounts =
      reaskCounts && typeof reaskCounts === "object" ? reaskCounts : {};

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.55,
      messages: [
        {
          role: "system",
          content: `
You are the CUSTOMER in a real estate roleplay chat.

You must write ONE natural customer message that fits the requested stage and tags.
Do NOT sound like a script. Sound like a real person speaking.

Hard rules:
- Use ONLY the provided conversation + signals.
- Do NOT introduce new facts (budget, timeline, baby, relocation, exact location) unless already in signals or said in chat.
- NEVER invent or suggest a specific street address or listing (no "2900 1st ave").
- If information is missing, ask a realistic customer follow-up question that matches the requested tags.
- Keep it 1–2 sentences. No emojis.

Stage intent:
2 = Motivation discovery (early, curious, renting, browsing online, space, relocation, neighborhood uncertainty)
3 = Qualification (budget, beds, commute, schools, HOA, pre-approval, sqft, timeline specifics)
4 = Objections (pressure, overpay, rates, crash, commitment, waiting)
5 = Value framing (why agent vs Zillow/listing agent; commission; buyer rep agreement; competitive advantage)
6 = Momentum / next step (what next, think it over, schedule, follow up)

Anti-loop rules (very important):
- Do not ask the same question twice.
- If the last customer message was a question and the agent did not answer it, you may rephrase ONCE.
- If this same intent has already been re-asked once (reaskCounts[intent] >= 1), do NOT re-ask again.
  Instead, switch to a different angle within the same stage.
- Avoid generic "what should we consider?" / "any tips?" questions more than once per session.

Return ONLY valid JSON in EXACT format:
{
  "text": "",
  "stage_id": 0,
  "tags": [],
  "intent": "",
  "requires_answer": true,
  "facts_used": [],
  "consistency_check": "ok | risk"
}

Intent guidelines (use simple stable labels):
- motivation_probe
- neighborhood_preferences
- community_vibe
- timeline
- budget_readiness
- qualification_details
- objection_pressure
- value_frame
- next_step
- clarification
`.trim(),
        },
        {
          role: "user",
          content: `
Requested stage: ${stageId}
Requested tags: ${(tags ?? []).filter(Boolean).join(", ")}

Known signals (may be empty):
${JSON.stringify(signals ?? {}, null, 2)}

Previously asked intents (coarse memory):
${JSON.stringify(askedIntents)}

Last intent (if tracked):
"${safeLastIntent}"

Re-ask counts by intent:
${JSON.stringify(safeReaskCounts, null, 2)}

Last customer message:
"${lastCustomer}"

Last agent message:
"${lastAgent}"

Recent chat:
${recent.map((m) => `${m.role}: ${m.text}`).join("\n")}
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
      const jsonMatch = raw.match(/\{[\s\S]*\}$/);
      if (!jsonMatch) throw new Error("Model output is not valid JSON");
      parsed = JSON.parse(jsonMatch[0]);
    }

    // sanity checks + defaults
    if (!parsed?.text || typeof parsed.text !== "string") {
      throw new Error("Generator returned invalid payload: missing text");
    }

    if (typeof parsed.stage_id !== "number") parsed.stage_id = stageId;
    if (!Array.isArray(parsed.tags)) parsed.tags = Array.isArray(tags) ? tags : [];

    if (typeof parsed.intent !== "string") parsed.intent = "";
    if (typeof parsed.requires_answer !== "boolean") parsed.requires_answer = true;

    if (!Array.isArray(parsed.facts_used)) parsed.facts_used = [];
    if (parsed.consistency_check !== "ok" && parsed.consistency_check !== "risk") {
      parsed.consistency_check = "ok";
    }

    // extra guard: prevent address-like output
    const addrLike =
      /\b\d{3,6}\s+\w+(\s+\w+){0,3}\s+(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive)\b/i;
    if (addrLike.test(parsed.text)) {
      parsed.text = parsed.text.replace(addrLike, "a specific address");
      parsed.consistency_check = "risk";
    }

    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err?.message ?? "Generate failed" },
      { status: 500 }
    );
  }
}
