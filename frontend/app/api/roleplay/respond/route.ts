// frontend/app/api/roleplay/respond/route.ts
import { NextResponse } from "next/server";
import { loadRoleplayScript } from "@/app/lib/roleplay/script";
import { getSession, saveSession } from "@/app/lib/roleplay/sessionStore";
import { applyOrganicProgression } from "@/app/lib/roleplay/engine";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { sessionId, agentMessage } = await req.json();

    if (!sessionId || !agentMessage) {
      return NextResponse.json(
        { error: "Missing sessionId or agentMessage" },
        { status: 400 },
      );
    }

    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const script = loadRoleplayScript();

    /* --------------------------------------------------
       1️⃣ Capture Last Customer Message (BEFORE push)
    --------------------------------------------------- */
    const lastCustomerMessage =
      [...session.messages].reverse().find((m) => m.role === "Customer")
        ?.text ?? "";

    /* --------------------------------------------------
       2️⃣ Store Agent Message
    --------------------------------------------------- */
    session.messages.push({
      role: "Agent",
      text: agentMessage,
      ts: Date.now(),
    });

    /* --------------------------------------------------
       3️⃣ Analyze Turn (Coaching Layer)
    --------------------------------------------------- */
    let turnAnalysis: any = null;

    try {
      const analyzeRes = await fetch(
        "http://localhost:3000/api/roleplay/analyze-turn",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stageId: session.stageId,
            lastCustomerMessage,
            agentMessage,
            signals: session.signals,
          }),
        },
      );

      if (analyzeRes.ok) {
        turnAnalysis = await analyzeRes.json();
      }
    } catch (err: any) {
      console.log("[ANALYZE ERROR]", err?.message ?? err);
    }

    // session.turnAnalyses ??= [];
    if (turnAnalysis) {
      session.turnAnalyses.push({
        stageId: session.stageId,
        agentMessage,
        analysis: turnAnalysis,
      });
    }

    /* --------------------------------------------------
       4️⃣ Call Router (Structural Signal Layer)
    --------------------------------------------------- */
    let routerDecision: any = {
      trigger: null,
      progress_signal: "stay",
      stage_progress_delta: 0,
      agent_label: "neutral",
      extracted_signals: {},
    };

    try {
      const routerRes = await fetch(
        "http://localhost:3000/api/roleplay/route",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stageId: session.stageId,
            messages: session.messages.slice(-10),
          }),
        },
      );

      if (routerRes.ok) {
        routerDecision = await routerRes.json();
      }

      console.log("[ROUTER]", routerDecision);
    } catch (err: any) {
      console.log("[ROUTER ERROR]", err?.message ?? err);
    }

    /* --------------------------------------------------
       5️⃣ Merge Extracted Signals (Overwrite Safe)
    --------------------------------------------------- */
    const rSignals = routerDecision.extracted_signals ?? {};
    const s = session.signals ?? {};

    if (
      rSignals.timeline_months !== null &&
      rSignals.timeline_months !== undefined
    ) {
      s.timeline_months = rSignals.timeline_months;
    }

    if (rSignals.budget !== null && rSignals.budget !== undefined) {
      s.budget = rSignals.budget;
    }

    s.needs = Array.from(
      new Set([...(s.needs ?? []), ...(rSignals.needs ?? [])]),
    );

    s.objections = Array.from(
      new Set([...(s.objections ?? []), ...(rSignals.objections ?? [])]),
    );

    if (rSignals.research_mode) {
      s.research_mode = rSignals.research_mode;
    }

    if (typeof rSignals.value_frame_trigger === "boolean") {
      s.value_frame_trigger = rSignals.value_frame_trigger;
    }

    if (rSignals.confidence !== null && rSignals.confidence !== undefined) {
      s.confidence = rSignals.confidence;
    }

    session.signals = s;

    /* --------------------------------------------------
       6️⃣ Call LLM /generate (Customer Simulation)
    --------------------------------------------------- */
    let generated: any;

    try {
      const genRes = await fetch(
        "http://localhost:3000/api/roleplay/generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stageId: session.stageId,
            signals: session.signals,
            messages: session.messages.slice(-12),
          }),
        },
      );

      const genJson = await genRes.json();
      if (!genRes.ok) {
        throw new Error(genJson?.error ?? "Customer generation failed");
      }

      generated = genJson;
    } catch (err: any) {
      console.log("[GENERATE ERROR]", err?.message ?? err);
      return NextResponse.json(
        { error: err?.message ?? "generate_failed" },
        { status: 500 },
      );
    }

    /* --------------------------------------------------
       7️⃣ Push Generated Customer Message
    --------------------------------------------------- */
    const botMsg = {
      role: "Customer" as const,
      text: generated.text,
      ts: Date.now(),
      meta: {
        stage_id: session.stageId,
        tags: generated.tags ?? [],
        intent: generated.intent ?? "",
        facts: generated.facts_used ?? [],
      },
    };

    session.messages.push(botMsg);

    // Increment stage utterance counter for generative mode
    session.stageUtterancesUsedCount[session.stageId] =
      (session.stageUtterancesUsedCount[session.stageId] ?? 0) + 1;

    /* --------------------------------------------------
       8️⃣ Apply Organic Stage Progression (Engine Only)
    --------------------------------------------------- */
    applyOrganicProgression(
      session,
      script,
      routerDecision,
      generated.tags ?? [],
    );

    /* --------------------------------------------------
       9️⃣ Save + Return
    --------------------------------------------------- */
    saveSession(session);

    return NextResponse.json({
      sessionId,
      stageId: session.stageId,
      done: false,
      botMessage: botMsg,
      debug: {
        router: routerDecision,
        turnAnalysis,
        stageProgress: session.stageProgressScore?.[session.stageId] ?? 0,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}
