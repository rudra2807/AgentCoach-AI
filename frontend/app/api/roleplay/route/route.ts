import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

type ChatMsg = { role: "Customer" | "Agent"; text: string };

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    const { stageId, messages, remainingUtteranceHints } = (await req.json()) as {
      stageId: number;
      messages: ChatMsg[];
      remainingUtteranceHints?: Array<{ id: string; stage_id: number; tags?: string[]; text: string }>;
    };

    if (!stageId || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Missing stageId or messages[]" },
        { status: 400 }
      );
    }

    // Keep payload small: only last ~10 turns
    const recent = messages.slice(-10);

    // Optional: give the router a short view of available moves (not the whole script)
    const hintText =
      remainingUtteranceHints?.length
        ? remainingUtteranceHints
            .slice(0, 25)
            .map(
              (u) =>
                `- id=${u.id} stage=${u.stage_id} tags=${(u.tags ?? []).join(",")} text="${u.text}"`
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
          content: `You are a routing engine for a real-estate roleplay chat.

                    The "Customer" messages come from a fixed script library.
                    Your job is NOT to write the customer's next message.
                    Your job is ONLY to return a JSON decision that helps the app choose the next scripted customer utterance.

                    You must infer:
                    1) how well the agent is handling the moment (agent_label)
                    2) what buying signals are present (extracted_signals)
                    3) which stage should come next (recommended_stage_id)
                    4) what tags to request from the script library (recommended_tags)

                    Rules:
                    - Use ONLY the provided chat context.
                    - Output MUST be valid JSON. No markdown, no extra text.
                    - "reason" must be a non-empty single sentence.
                    - confidence values must be between 0.3 and 0.95 (never 0).

                    Agent labels:
                    - "acknowledged": explicitly validates last customer point (e.g., "makes sense", "totally", "got it") and continues smoothly
                    - "good_discovery": asks specific follow-ups tied to customer’s last statement (timeline, motivation, constraints)
                    - "neutral": generic questions without explicit acknowledgment or depth
                    - "unclear": very short / repetitive responses or confusing/awkward phrasing
                    - "pushy": pressures, rushes, or ignores stated preferences
                    - "pushed_listings": pushes listings/showings/offers too early

                    Stage rubric (use these, do not be overly conservative):
                    - Stage 2 (Motivation Discovery): early exploration, motivation, renting/relocation, browsing online, curiosity.
                    - Stage 3 (Qualification & Depth): budget, beds/baths, sqft, commute, schools, HOA, pre-approval/lender, timeline specifics.
                    - Stage 4 (Objection Handling): buyer expresses hesitation/pressure/overpay/rates/crash/commitment fears.
                    - Stage 5 (Value Frame testing): buyer is self-educating (Zillow/Redfin/online browsing), questioning agent value, “what do you do?”, “why sign?”, “can we go to listing agent?”
                    - Stage 6 (Momentum/Next steps): buyer asks what’s next, wants to think, delays, scheduling, “we’ll reach out”.

                    Escalation triggers:
                    - If the agent ignores "not in a rush" and pushes urgency/showings/listings => recommended_stage_id=4 and should_escalate_to_objections=true.
                    - If the customer mentions browsing Zillow/Redfin/online a lot or implies “we can do this ourselves” => recommended_stage_id=5.
                    - If the customer states budget, pre-approval, beds/sqft, commute/schools, or timeline detail => recommended_stage_id=3.
                    - If the customer expresses fear/pressure/overpay/rates/market crash => recommended_stage_id=4.

                    Return JSON in EXACT format:
                    {
                    "agent_label": "acknowledged | pushed_listings | neutral | good_discovery | pushy | unclear",
                    "recommended_stage_id": 2,
                    "should_escalate_to_objections": false,
                    "recommended_tags": [],
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

                    Tag guidance:
                    - If recommended_stage_id=2, tags should be like: motivation, researching_online, renting, relocation, space_need, neighborhood_uncertainty
                    - If recommended_stage_id=3, tags should be like: budget, beds, sqft, commute, schools, hoa, preapproval, timeline
                    - If recommended_stage_id=4, tags should be like: objection_pressure, objection_overpay, objection_rates, objection_wait, objection_commitment
                    - If recommended_stage_id=5, tags should be like: value_frame, zillow_vs_agent, buyer_rep_agreement, commission, competitive_advantage
                    - If recommended_stage_id=6, tags should be like: next_step, follow_up, scheduling, hesitation, think_it_over
                    `.trim()
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
