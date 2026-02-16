// frontend/app/api/roleplay/start/route.ts
import { NextResponse } from "next/server";
import { loadRoleplayScript } from "@/app/lib/roleplay/script";
import { createSession, saveSession } from "@/app/lib/roleplay/sessionStore";
import { pickNextBotMessage } from "@/app/lib/roleplay/engine";

export const runtime = "nodejs";

export async function POST() {
  try {
    const script = loadRoleplayScript();
    const session = createSession(script.script_id, script.version, 2);

    const next = pickNextBotMessage(session, script);
    saveSession(session);

    if (next.done || !next.message) {
      return NextResponse.json({ error: "No messages available in script." }, { status: 500 });
    }

    return NextResponse.json({
      sessionId: session.sessionId,
      stageId: session.stageId,
      botMessage: next.message
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
