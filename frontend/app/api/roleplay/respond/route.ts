// frontend/app/api/roleplay/respond/route.ts
import { NextResponse } from "next/server";
import { loadRoleplayScript } from "@/app/lib/roleplay/script";
import { getSession, saveSession } from "@/app/lib/roleplay/sessionStore";
import { buildRemainingUtteranceHints } from "@/app/lib/roleplay/hints";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, agentMessage } = body ?? {};

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }
    if (!agentMessage || typeof agentMessage !== "string") {
      return NextResponse.json(
        { error: "Missing agentMessage" },
        { status: 400 },
      );
    }

    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: "Session not found (server restarted?)" },
        { status: 404 },
      );
    }

    // ensure signals container exists
    // (If your RoleplaySignals type doesn't yet include these fields, keep `as any` here.
    const sig = (session.signals ?? {}) as any;
    sig.reask_count_by_intent = sig.reask_count_by_intent ?? {};
    sig.asked_intents = sig.asked_intents ?? [];
    sig.last_customer_intent = sig.last_customer_intent ?? "";
    session.signals = sig;

    // 1) store agent message
    session.messages.push({
      role: "Agent",
      text: agentMessage,
      ts: Date.now(),
    });

    // We still load the script only to build hintText for routing (optional)
    const script = loadRoleplayScript();

    // 2) ROUTER: decide stage + tags + signals
    let routerDecision: any = null;

    try {
      const recentMessages = session.messages
        .slice(-10)
        .filter((m) => m.role === "Agent" || m.role === "Customer")
        .map((m) => ({ role: m.role, text: m.text }));

      const remainingUtteranceHints = buildRemainingUtteranceHints(
        session,
        script,
        25,
      );

      const routerRes = await fetch(
        "http://localhost:3000/api/roleplay/route",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stageId: session.stageId,
            messages: recentMessages,
            remainingUtteranceHints,
          }),
        },
      );

      const routerJson = await routerRes.json();
      routerDecision = routerJson;

      // merge extracted signals into session memory (preserve our internal memory keys)
      if (routerDecision?.extracted_signals) {
        const s = session.signals as any;
        session.signals = {
          ...s,
          ...routerDecision.extracted_signals,
          asked_intents: s.asked_intents ?? [],
          last_customer_intent: s.last_customer_intent ?? "",
          reask_count_by_intent: s.reask_count_by_intent ?? {},
        };
      }

      console.log("[ROLEPLAY ROUTER]", JSON.stringify(routerDecision, null, 2));
    } catch (e: any) {
      console.log("[ROLEPLAY ROUTER ERROR]", e?.message ?? e);
      routerDecision = { error: e?.message ?? "router_failed" };
    }

    // 3) Choose stage + tags
    const recStage = Number(
      routerDecision?.recommended_stage_id ?? session.stageId,
    );
    const recTags = Array.isArray(routerDecision?.recommended_tags)
      ? routerDecision.recommended_tags
      : [];

    if ([2, 3, 4, 5, 6].includes(recStage)) {
      session.stageId = recStage;
    }

    // 4) GENERATE: produce customer message from category (stage + tags)
    let generated: any = null;

    try {
      const genRes = await fetch(
        "http://localhost:3000/api/roleplay/generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stageId: session.stageId,
            tags: recTags,
            signals: session.signals ?? {},
            lastIntent: (session.signals as any)?.last_customer_intent ?? "",
            reaskCounts: (session.signals as any)?.reask_count_by_intent ?? {},
            messages: session.messages
              .slice(-12)
              .filter((m) => m.role === "Agent" || m.role === "Customer")
              .map((m) => ({ role: m.role, text: m.text })),
          }),
        },
      );

      const genJson = await genRes.json();
      if (!genRes.ok) {
        throw new Error(genJson?.error ?? "Customer generation failed");
      }
      generated = genJson;
    } catch (e: any) {
      console.log("[ROLEPLAY GENERATE ERROR]", e?.message ?? e);
      return NextResponse.json(
        {
          error: e?.message ?? "generate_failed",
          debug: { router: routerDecision },
        },
        { status: 500 },
      );
    }

    // 5) Update anti-loop memory from generated intent
    const newIntent =
      typeof generated?.intent === "string" ? generated.intent.trim() : "";
    const s = session.signals as any;
    const prevIntent =
      typeof s.last_customer_intent === "string" ? s.last_customer_intent : "";

    if (newIntent) {
      s.asked_intents = Array.from(
        new Set([...(s.asked_intents ?? []), newIntent]),
      );
      s.reask_count_by_intent = s.reask_count_by_intent ?? {};

      if (prevIntent && prevIntent === newIntent) {
        s.reask_count_by_intent[newIntent] =
          (s.reask_count_by_intent[newIntent] ?? 0) + 1;
      } else {
        s.reask_count_by_intent[newIntent] = 0;
      }

      s.last_customer_intent = newIntent;
      session.signals = s;
    }

    // 6) Push generated customer message into session
    const botMsg = {
      role: "Customer" as const,
      text: generated.text,
      ts: Date.now(),
      meta: {
        stage_id: session.stageId,
        tags: Array.isArray(generated.tags) ? generated.tags : recTags,
        intent: newIntent,
        requires_answer:
          typeof generated.requires_answer === "boolean"
            ? generated.requires_answer
            : true,
        facts: { facts_used: generated.facts_used ?? [] },
        consistency_check: generated.consistency_check ?? "ok",
      },
    };

    session.messages.push(botMsg);

    // 7) Persist + return
    saveSession(session);

    return NextResponse.json({
      sessionId,
      stageId: session.stageId,
      done: false,
      botMessage: botMsg,
      debug: { router: routerDecision, generated },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}
