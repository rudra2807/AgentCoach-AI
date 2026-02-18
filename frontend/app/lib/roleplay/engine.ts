import type { RoleplayScript } from "@/app/lib/roleplay/script";
import type {
  RoleplaySession,
  ChatMessage,
} from "@/app/lib/roleplay/sessionStore";

/* ------------------------------
   Helpers
--------------------------------*/

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function getStage(script: RoleplayScript, stageId: number) {
  return script.stages.find((s) => s.stage_id === stageId);
}

function getNextStageId(
  script: RoleplayScript,
  currentStageId: number,
): number | null {
  const policy = getStage(script, currentStageId)?.policy;
  if (policy?.next_stage !== undefined) return policy.next_stage;

  const ids = script.stages.map((s) => s.stage_id).sort((a, b) => a - b);
  const idx = ids.indexOf(currentStageId);
  if (idx >= 0 && idx < ids.length - 1) return ids[idx + 1];
  return null;
}

function initStageMemory(session: RoleplaySession, stageId: number) {
  // session.stageUtterancesUsedCount[stageId] ??= 0;
  session.stageUtterancesUsedCount[session.stageId] =
    (session.stageUtterancesUsedCount[session.stageId] ?? 0) + 1;
  session.stageProgressScore ??= {};
  session.stageProgressScore[stageId] ??= 0;
  session.stageTagMemory ??= {};
  session.stageTagMemory[stageId] ??= [];
}

/* ------------------------------
   Organic Stage Progression
--------------------------------*/

export function applyOrganicProgression(
  session: RoleplaySession,
  script: RoleplayScript,
  router: {
    trigger?: string | null;
    progress_signal?: "stay" | "advance" | "escalate";
    stage_progress_delta?: number;
    agent_label?: string;
    extracted_signals?: any;
  },
  customerTagsUsed: string[],
) {
  const currentStage = session.stageId;
  initStageMemory(session, currentStage);

  const stage = getStage(script, currentStage);
  if (!stage) return;

  const policy = stage.policy ?? {};
  const nextStage = getNextStageId(script, currentStage);

  /* ---- Update tag memory ---- */
  if (customerTagsUsed?.length) {
    session.stageTagMemory[currentStage].push(...customerTagsUsed);
  }

  /* ---- HARD TRANSITIONS ---- */
  if (router.trigger && script.transitions) {
    const transition = script.transitions.find(
      (t) => t.from_stage === currentStage && t.trigger === router.trigger,
    );

    if (transition && transition.to_stage > currentStage) {
      session.stageId = transition.to_stage;
      initStageMemory(session, transition.to_stage);
      return;
    }
  }

  /* ---- Score update ---- */
  const delta = clamp(router.stage_progress_delta ?? 0, -20, 40);
  session.stageProgressScore[currentStage] = clamp(
    session.stageProgressScore[currentStage] + delta,
    0,
    120,
  );

  const score = session.stageProgressScore[currentStage];
  const threshold = policy.progress_threshold ?? 80;
  const requiredTags = policy.required_tags ?? [];

  const requiredSatisfied =
    requiredTags.length === 0 ||
    requiredTags.every((tag) =>
      (session.stageTagMemory[currentStage] ?? []).includes(tag),
    );

  const utterCount = session.stageUtterancesUsedCount[currentStage] ?? 0;
  const maxU = policy.max_utterances ?? 999;

  const routerWantsAdvance = router.progress_signal === "advance";

  let shouldAdvance =
    nextStage &&
    nextStage > currentStage &&
    ((routerWantsAdvance && score >= threshold && requiredSatisfied) ||
      score >= threshold ||
      utterCount >= maxU);

  /* ---- Optional stage skipping ---- */
  if (shouldAdvance && nextStage) {
    const nextStageDef = getStage(script, nextStage);
    if (nextStageDef?.policy?.optional) {
      const signals = router.extracted_signals ?? {};

      const needsOptional =
        nextStage === 4
          ? (signals.objections?.length ?? 0) > 0
          : nextStage === 5
            ? signals.value_frame_trigger === true ||
              signals.research_mode === "online_browsing"
            : true;

      if (!needsOptional) {
        const skipTo = getNextStageId(script, nextStage);
        if (skipTo) {
          session.stageId = skipTo;
          initStageMemory(session, skipTo);
          return;
        }
      }
    }

    session.stageId = nextStage;
    initStageMemory(session, nextStage);
  }
}

/* ------------------------------
   Utterance Selection
--------------------------------*/

function eligibleUtterance(
  session: RoleplaySession,
  u: RoleplayScript["utterances"][number],
) {
  if (session.usedUtteranceIds.has(u.id)) return false;

  if (u.requires) {
    for (const r of u.requires) {
      if (!session.usedUtteranceIds.has(r)) return false;
    }
  }

  if (u.variant_group) {
    const chosen = session.variantSelections[u.variant_group];
    if (chosen && u.variant_key && chosen !== u.variant_key) return false;
  }

  return true;
}

export function pickNextBotMessage(
  session: RoleplaySession,
  script: RoleplayScript,
): { done: boolean; message?: ChatMessage } {
  const candidates = script.utterances
    .filter((u) => u.stage_id === session.stageId)
    .filter((u) => eligibleUtterance(session, u));

  if (candidates.length === 0) {
    const nextStage = getNextStageId(script, session.stageId);
    if (!nextStage) return { done: true };

    session.stageId = nextStage;
    initStageMemory(session, nextStage);

    return pickNextBotMessage(session, script);
  }

  // Slight randomness to prevent rigidity
  const chosen =
    candidates[Math.floor(Math.random() * Math.min(3, candidates.length))];

  return emit(session, chosen);
}

function emit(
  session: RoleplaySession,
  u: RoleplayScript["utterances"][number],
) {
  if (u.variant_group && u.variant_key) {
    if (!session.variantSelections[u.variant_group]) {
      session.variantSelections[u.variant_group] = u.variant_key;
    }
  }

  session.usedUtteranceIds.add(u.id);
  session.stageUtterancesUsedCount[session.stageId] =
    (session.stageUtterancesUsedCount[session.stageId] ?? 0) + 1;

  const msg: ChatMessage = {
    role: "Customer",
    text: u.text,
    ts: Date.now(),
    meta: {
      utterance_id: u.id,
      stage_id: u.stage_id,
      tags: u.tags ?? [],
      facts: u.facts ?? {},
    },
  };

  session.messages.push(msg);
  return { done: false, message: msg };
}
