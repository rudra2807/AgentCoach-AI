// frontend/app/lib/roleplay/script.ts
import fs from "fs";
import path from "path";

/* ------------------------------
   Types
--------------------------------*/

export type StagePolicy = {
  min_utterances?: number;
  max_utterances?: number;
  required_tags?: string[];
  next_stage?: number | null;

  // NEW – organic progression controls
  optional?: boolean;
  progress_threshold?: number;
};

export type RoleplayScript = {
  script_id: string;
  version: number;

  stages: Array<{
    stage_id: number;
    name: string;
    policy: StagePolicy;
  }>;

  transitions?: Array<{
    from_stage: number;
    trigger: string;
    to_stage: number;
    note?: string;
  }>;

  utterances: Array<{
    id: string;
    stage_id: number;
    text: string;

    once?: boolean;

    variant_group?: string;
    variant_key?: string;

    requires?: string[];

    tags?: string[];
    facts?: Record<string, any>;
  }>;
};

/* ------------------------------
   Loader
--------------------------------*/

export function loadRoleplayScript(): RoleplayScript {
  const filePath = path.join(
    process.cwd(),
    "app",
    "lib",
    "scripts",
    "customer_roleplay_flow_v1.json",
  );

  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw);

  validateScript(parsed);

  return parsed as RoleplayScript;
}

/* ------------------------------
   Validation
--------------------------------*/

function validateScript(script: any) {
  if (!script || typeof script !== "object") {
    throw new Error("Invalid roleplay script: not an object");
  }

  if (!Array.isArray(script.stages) || script.stages.length === 0) {
    throw new Error("Invalid roleplay script: missing stages[]");
  }

  if (!Array.isArray(script.utterances) || script.utterances.length === 0) {
    throw new Error("Invalid roleplay script: missing utterances[]");
  }

  const stageIds = new Set<number>();

  for (const stage of script.stages) {
    if (typeof stage.stage_id !== "number") {
      throw new Error("Invalid roleplay script: stage_id must be number");
    }

    if (!stage.policy) {
      stage.policy = {};
    }

    // Set safe defaults for organic engine
    stage.policy.progress_threshold ??= 80;
    stage.policy.optional ??= false;

    stageIds.add(stage.stage_id);
  }

  for (const u of script.utterances) {
    if (!u.id || typeof u.id !== "string") {
      throw new Error("Invalid roleplay script: utterance missing id");
    }

    if (typeof u.stage_id !== "number") {
      throw new Error(`Invalid utterance ${u.id}: missing stage_id`);
    }

    if (!stageIds.has(u.stage_id)) {
      throw new Error(
        `Invalid utterance ${u.id}: references unknown stage_id ${u.stage_id}`,
      );
    }
  }

  if (script.transitions) {
    for (const t of script.transitions) {
      if (
        typeof t.from_stage !== "number" ||
        typeof t.to_stage !== "number" ||
        typeof t.trigger !== "string"
      ) {
        throw new Error("Invalid transition format in roleplay script");
      }

      if (!stageIds.has(t.from_stage) || !stageIds.has(t.to_stage)) {
        throw new Error(
          `Transition references invalid stage: ${t.from_stage} -> ${t.to_stage}`,
        );
      }
    }
  }
}
