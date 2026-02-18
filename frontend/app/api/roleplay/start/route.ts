// frontend/app/api/roleplay/start/route.ts
import { NextResponse } from "next/server";
import { loadRoleplayScript } from "@/app/lib/roleplay/script";
import { createSession, saveSession } from "@/app/lib/roleplay/sessionStore";

export const runtime = "nodejs";

export async function POST() {
  try {
    const script = loadRoleplayScript();

    // Always start at Stage 2 (Motivation Discovery)
    const session = createSession(script.script_id, script.version, 2);

    // Persist empty session first
    saveSession(session);

    /* ------------------------------------------
       Generate First Customer Message (LLM)
    ------------------------------------------- */

    const genRes = await fetch("http://localhost:3000/api/roleplay/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stageId: session.stageId,
        signals: session.signals,
        messages: [], // no prior context
        firstMessage: true, // signal that this is the first message
      }),
    });

    const genJson = await genRes.json();
    if (!genRes.ok) {
      throw new Error(genJson?.error ?? "Initial generation failed");
    }

    const botMessage = {
      role: "Customer" as const,
      text: genJson.text,
      ts: Date.now(),
      meta: {
        stage_id: session.stageId,
        tags: genJson.tags ?? [],
        intent: genJson.intent ?? "",
        facts: genJson.facts_used ?? [],
      },
    };

    session.messages.push(botMessage);

    // Track utterance count for generative mode
    session.stageUtterancesUsedCount[session.stageId] =
      (session.stageUtterancesUsedCount[session.stageId] ?? 0) + 1;

    saveSession(session);

    return NextResponse.json({
      sessionId: session.sessionId,
      stageId: session.stageId,
      botMessage,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}
