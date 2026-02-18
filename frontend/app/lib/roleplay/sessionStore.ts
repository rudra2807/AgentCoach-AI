// frontend/app/lib/roleplay/sessionStore.ts
import crypto from "crypto";

/* ------------------------------
   Message
--------------------------------*/

export type ChatMessage = {
  role: "Customer" | "Agent" | "System";
  text: string;
  ts: number;
  meta?: Record<string, any>;
};

/* ------------------------------
   Signals (LLM extracted memory)
--------------------------------*/

export type RoleplaySignals = {
  timeline_months?: number | null;
  budget?: number | null;
  needs?: string[];
  objections?: string[];
  confidence?: number | null;

  research_mode?: "online_browsing" | "agent_led" | "open_houses" | "unknown";
  value_frame_trigger?: boolean;

  // Anti-loop memory
  asked_intents?: string[];
  last_customer_intent?: string;
  reask_count_by_intent?: Record<string, number>;
};

/* ------------------------------
   Session
--------------------------------*/

export type TurnAnalysis = {
  stageId: number;
  agentMessage: string;
  analysis: {
    answered_customer_question: boolean;
    acknowledged_concern: boolean;
    stage_alignment: "strong" | "acceptable" | "weak";
    strengths: string[];
    missed_opportunities: string[];
    pushiness_score: number;
    clarity_score: number;
    discovery_score: number;
    suggested_improvement: string;
    confidence: number;
  };
};

export type RoleplaySession = {
  sessionId: string;
  scriptId: string;
  version: number;

  stageId: number;

  // deterministic engine memory
  stageUtterancesUsedCount: Record<number, number>;
  stageProgressScore: Record<number, number>;
  stageTagMemory: Record<number, string[]>;

  usedUtteranceIds: Set<string>;
  variantSelections: Record<string, string>;

  flags: Record<string, boolean>;
  signals: RoleplaySignals;

  messages: ChatMessage[];

  turnAnalyses: TurnAnalysis[];

  createdAt: number;
  updatedAt: number;
};

/* ------------------------------
   In-Memory Store
--------------------------------*/

const store = new Map<string, RoleplaySession>();

export function createSession(
  scriptId: string,
  version: number,
  initialStageId = 2,
): RoleplaySession {
  const sessionId = crypto.randomUUID();

  const session: RoleplaySession = {
    sessionId,
    scriptId,
    version,

    stageId: initialStageId,

    stageUtterancesUsedCount: {},
    stageProgressScore: {},
    stageTagMemory: {},

    usedUtteranceIds: new Set(),
    variantSelections: {},

    flags: {},
    signals: {
      asked_intents: [],
      reask_count_by_intent: {},
    },

    messages: [],
    turnAnalyses: [],

    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  store.set(sessionId, session);
  return session;
}

export function getSession(sessionId: string): RoleplaySession | null {
  return store.get(sessionId) ?? null;
}

export function saveSession(session: RoleplaySession) {
  session.updatedAt = Date.now();
  store.set(session.sessionId, session);
}

export function deleteSession(sessionId: string) {
  store.delete(sessionId);
}
