import type { RoleplayScript } from "@/app/lib/roleplay/script";
import type { RoleplaySession, ChatMessage } from "@/app/lib/roleplay/sessionStore";


function defaultMaxByStage(stageId: number) {
  if (stageId === 2) return 7;
  if (stageId === 3) return 8;
  if (stageId === 4) return 6;
  if (stageId === 5) return 3;
  if (stageId === 6) return 4;
  return 5;
}

function getStagePolicy(script: RoleplayScript, stageId: number) {
  return script.stages.find(s => s.stage_id === stageId)?.policy ?? {};
}

function getNextStageId(script: RoleplayScript, currentStageId: number): number | null {
  const policy = getStagePolicy(script, currentStageId);
  if (typeof policy.next_stage === "number") return policy.next_stage;
  if (policy.next_stage === null) return null;

  // fallback: next numeric stage if exists
  const stageIds = script.stages.map(s => s.stage_id).sort((a, b) => a - b);
  const idx = stageIds.indexOf(currentStageId);
  if (idx >= 0 && idx < stageIds.length - 1) return stageIds[idx + 1];
  return null;
}

function shouldAdvanceStage(session: RoleplaySession, script: RoleplayScript): boolean {
  const policy = getStagePolicy(script, session.stageId);
  const max = policy.max_utterances ?? defaultMaxByStage(session.stageId);
  const usedCount = session.stageUtterancesUsedCount[session.stageId] ?? 0;
  return usedCount >= max;
}

function eligibleUtterance(session: RoleplaySession, u: RoleplayScript["utterances"][number]) {
  // once / already used
  if (session.usedUtteranceIds.has(u.id)) return false;

  // requires
  if (u.requires && u.requires.length > 0) {
    for (const req of u.requires) {
      if (!session.usedUtteranceIds.has(req)) return false;
    }
  }

  // variant selection locking
  if (u.variant_group) {
    const chosen = session.variantSelections[u.variant_group];
    if (chosen && u.variant_key && chosen !== u.variant_key) return false;
  }

  return true;
}

export function pickNextBotMessage(session: RoleplaySession, script: RoleplayScript): { done: boolean; message?: ChatMessage } {
  // advance stage if needed
  if (shouldAdvanceStage(session, script)) {
    const nextStage = getNextStageId(script, session.stageId);
    if (nextStage === null) return { done: true };
    session.stageId = nextStage;
  }

  // find next eligible utterance in this stage
  const candidates = script.utterances
    .filter(u => u.stage_id === session.stageId)
    .sort((a, b) => a.id.localeCompare(b.id))
    .filter(u => eligibleUtterance(session, u));

  if (candidates.length === 0) {
    // no utterances left in this stage -> advance and retry once
    const nextStage = getNextStageId(script, session.stageId);
    if (nextStage === null) return { done: true };
    session.stageId = nextStage;

    const nextCandidates = script.utterances
      .filter(u => u.stage_id === session.stageId)
      .sort((a, b) => a.id.localeCompare(b.id))
      .filter(u => eligibleUtterance(session, u));

    if (nextCandidates.length === 0) return { done: true };

    return emit(session, nextCandidates[0]);
  }

  return emit(session, candidates[0]);
}

function emit(session: RoleplaySession, u: RoleplayScript["utterances"][number]) {
  // lock variant group if present
  if (u.variant_group && u.variant_key) {
    if (!session.variantSelections[u.variant_group]) {
      session.variantSelections[u.variant_group] = u.variant_key;
    }
  }

  session.usedUtteranceIds.add(u.id);
  session.stageUtterancesUsedCount[session.stageId] = (session.stageUtterancesUsedCount[session.stageId] ?? 0) + 1;

  const msg: ChatMessage = {
    role: "Customer",
    text: u.text,
    ts: Date.now(),
    meta: {
      utterance_id: u.id,
      stage_id: u.stage_id,
      tags: u.tags ?? [],
      facts: u.facts ?? {}
    }
  };

  session.messages.push(msg);
  return { done: false, message: msg };
}

// Simple trigger rules (optional now). You can improve this later.
export function applyAgentTriggers(session: RoleplaySession, agentText: string) {
  const t = agentText.toLowerCase();

  const pushesListings =
    t.includes("tour") ||
    t.includes("showing") ||
    t.includes("schedule") ||
    t.includes("appointment") ||
    t.includes("i can send listings") ||
    t.includes("i'll send listings") ||
    t.includes("here are some listings");

  if (pushesListings) session.flags["agent_pushes_listings_early"] = true;

  // If triggered, you can jump to objections (Stage 4) immediately.
  if (session.flags["agent_pushes_listings_early"]) {
    session.stageId = 4;
  }
}
