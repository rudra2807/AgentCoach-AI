import type { RoleplayScript } from "@/app/lib/roleplay/script";
import type { RoleplaySession } from "@/app/lib/roleplay/sessionStore";
import { pickNextBotMessage } from "@/app/lib/roleplay/engine";

function eligible(session: RoleplaySession, u: any) {
  if (session.usedUtteranceIds.has(u.id)) return false;

  if (u.requires?.length) {
    for (const req of u.requires) {
      if (!session.usedUtteranceIds.has(req)) return false;
    }
  }

  if (u.variant_group) {
    const chosen = session.variantSelections[u.variant_group];
    if (chosen && u.variant_key && chosen !== u.variant_key) return false;
  }

  return true;
}

export function pickNextBotMessageByTags(
  session: RoleplaySession,
  script: RoleplayScript,
  stageId: number,
  desiredTags: string[]
) {
  const tags = new Set((desiredTags ?? []).filter(Boolean));

  // If no tags provided, fallback to default picker
//   if (tags.size === 0) return pickNextBotMessage(session, script);
    if (tags.size === 0) {
    // fallback within requested stage
    const fallback = script.utterances
        .filter((u) => u.stage_id === stageId)
        .sort((a, b) => a.id.localeCompare(b.id))
        .find((u) => eligible(session, u));

    if (!fallback) return pickNextBotMessage(session, script); // last resort

    session.stageId = stageId;

    if (fallback.variant_group && fallback.variant_key) {
        if (!session.variantSelections[fallback.variant_group]) {
        session.variantSelections[fallback.variant_group] = fallback.variant_key;
        }
    }

    session.usedUtteranceIds.add(fallback.id);
    // session.stageUtterancesUsedCount[stageId] =
    //     (session.stageUtterancesUsedCount[stageId] ?? 0) + 1;
    session.stageUtterancesUsedCount[stageId] = (session.stageUtterancesUsedCount[stageId] ?? 0) + 1;


    const msg = {
        role: "Customer" as const,
        text: fallback.text,
        ts: Date.now(),
        meta: {
        utterance_id: fallback.id,
        stage_id: fallback.stage_id,
        tags: fallback.tags ?? [],
        facts: fallback.facts ?? {},
        },
    };

    session.messages.push(msg);
    return { done: false, message: msg };
    }


  const candidates = script.utterances
    .filter((u) => u.stage_id === stageId)
    .sort((a, b) => a.id.localeCompare(b.id))
    .filter((u) => eligible(session, u))
    .map((u) => ({
      u,
      score: (u.tags ?? []).reduce((acc: number, t: string) => acc + (tags.has(t) ? 1 : 0), 0)
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.u.id.localeCompare(b.u.id));

//   if (candidates.length === 0) {
//     // no tag match → fallback
//     return pickNextBotMessage(session, script);
//   }
    if (candidates.length === 0) {
        // fallback within the requested stage only
        const fallback = script.utterances
            .filter((u) => u.stage_id === stageId)
            .sort((a, b) => a.id.localeCompare(b.id))
            .find((u) => eligible(session, u));

        if (!fallback) return pickNextBotMessage(session, script);

        session.stageId = stageId;

        if (fallback.variant_group && fallback.variant_key) {
            if (!session.variantSelections[fallback.variant_group]) {
            session.variantSelections[fallback.variant_group] = fallback.variant_key;
            }
        }

        session.usedUtteranceIds.add(fallback.id);
        session.stageUtterancesUsedCount[stageId] =
            (session.stageUtterancesUsedCount[stageId] ?? 0) + 1;

        const msg = {
            role: "Customer" as const,
            text: fallback.text,
            ts: Date.now(),
            meta: {
            utterance_id: fallback.id,
            stage_id: fallback.stage_id,
            tags: fallback.tags ?? [],
            facts: fallback.facts ?? {}
            }
        };

        session.messages.push(msg);
        return { done: false, message: msg };
        }


  // Temporarily set stage (so engine emits with correct stage count)
  session.stageId = stageId;

  // Emit the best candidate using your existing engine behavior:
  // easiest: mark it used + push message same as engine does
  const chosen = candidates[0].u;

  // lock variant if any
  if (chosen.variant_group && chosen.variant_key) {
    if (!session.variantSelections[chosen.variant_group]) {
      session.variantSelections[chosen.variant_group] = chosen.variant_key;
    }
  }

  session.usedUtteranceIds.add(chosen.id);
  session.stageUtterancesUsedCount[session.stageId] =
    (session.stageUtterancesUsedCount[session.stageId] ?? 0) + 1;

  const msg = {
    role: "Customer" as const,
    text: chosen.text,
    ts: Date.now(),
    meta: {
      utterance_id: chosen.id,
      stage_id: chosen.stage_id,
      tags: chosen.tags ?? [],
      facts: chosen.facts ?? {}
    }
  };

  session.messages.push(msg);
  return { done: false, message: msg };
}

