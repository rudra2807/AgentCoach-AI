import type { RoleplayScript } from "@/app/lib/roleplay/script";
import type { RoleplaySession } from "@/app/lib/roleplay/sessionStore";

export function buildRemainingUtteranceHints(
  session: RoleplaySession,
  script: RoleplayScript,
  limit = 25
) {
  return script.utterances
    .filter((u) => !session.usedUtteranceIds.has(u.id))
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, limit)
    .map((u) => ({
      id: u.id,
      stage_id: u.stage_id,
      tags: u.tags ?? [],
      text: u.text
    }));
}
