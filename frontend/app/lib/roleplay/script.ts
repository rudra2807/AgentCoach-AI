// frontend/app/lib/roleplay/script.ts
import fs from "fs";
import path from "path";

export type RoleplayScript = {
  script_id: string;
  version: number;
  stages: Array<{
    stage_id: number;
    name: string;
    policy?: {
      min_utterances?: number;
      max_utterances?: number;
      next_stage?: number | null;
    };
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

const SCRIPT_RELATIVE_PATH = "../scripts/customer_roleplay_flow_v1.json";

export function loadRoleplayScript(): RoleplayScript {
  const filePath = path.join(process.cwd(), "app", "lib", "scripts", "customer_roleplay_flow_v1.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw);

  // lightweight validation
  if (!parsed?.stages || !Array.isArray(parsed.stages)) {
    throw new Error("Invalid roleplay script: missing stages[]");
  }
  if (!parsed?.utterances || !Array.isArray(parsed.utterances)) {
    throw new Error("Invalid roleplay script: missing utterances[]");
  }
  return parsed as RoleplayScript;
}
