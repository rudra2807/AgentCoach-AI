// // app/api/roleplay/realtime-token/route.ts

// import { NextResponse } from "next/server";

// export async function POST() {
//   const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
//     method: "POST",
//     headers: {
//       Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({
//       model: "gpt-realtime",
//       voice: "alloy",
//       instructions: `
// You are a realistic home buyer in Seattle.

// Behavior:
// - You are cautious.
// - You are not fully committed yet.
// - You occasionally mention Zillow.
// - Keep responses under 12 seconds.
// - Ask one concern at a time.
// - Speak naturally, not robotic.
// - Do not give long monologues.
// - Let the agent lead if they take control.
//       `,
//     }),
//   });

//   const data = await response.json();
//   return NextResponse.json(data);
// }

// frontend/app/api/roleplay/realtime-token/route.ts

import { NextResponse } from "next/server";
import { getScenarioById } from "@/app/lib/roleplay/scenarios";
import { buildSessionInstructions } from "@/app/lib/roleplay/prompt";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const scenarioId = typeof body?.scenarioId === "string" ? body.scenarioId : null;

    const scenario = getScenarioById(scenarioId);
    const instructions = buildSessionInstructions(scenario);

    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-realtime",
        voice: "alloy",
        instructions,
      }),
    });

    const data = await response.json();

    // Optional: attach scenario metadata so the client can confirm what was used
    return NextResponse.json({
      ...data,
      _scenario: { id: scenario.id, title: scenario.title },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to create realtime session" },
      { status: 500 }
    );
  }
}