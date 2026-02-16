// frontend/app/lib/roleplay/sessionStore.ts
import crypto from "crypto";

export type ChatMessage = {
  role: "Customer" | "Agent" | "System";
  text: string;
  ts: number;
  meta?: Record<string, any>;
};

// export type RoleplaySignals = {
//   timeline_months?: number | null;
//   budget?: number | null;
//   needs?: string[];
//   objections?: string[];
//   confidence?: number | null;
//   // add more later (pre_approved, neighborhoods, etc.)
// };


export type RoleplaySession = {
  sessionId: string;
  scriptId: string;
  version: number;

  stageId: number;
  stageUtterancesUsedCount: Record<number, number>; // how many bot lines used per stage
  usedUtteranceIds: Set<string>;

  variantSelections: Record<string, string>; // group -> variant_key
  flags: Record<string, boolean>;
  signals: RoleplaySignals; 
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
};

// In-memory store (works for local dev). For production use Redis/DB.
const store = new Map<string, RoleplaySession>();

export function createSession(scriptId: string, version: number, initialStageId = 2): RoleplaySession {
  const sessionId = crypto.randomUUID();

  const session: RoleplaySession = {
    sessionId,
    scriptId,
    version,
    stageId: initialStageId,
    stageUtterancesUsedCount: {},
    usedUtteranceIds: new Set(),
    variantSelections: {},
    flags: {},
    signals: {},
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };


  store.set(sessionId, session);
  return session;
}
export type RoleplaySignals = {
  timeline_months?: number | null;
  budget?: number | null;
  needs?: string[];
  objections?: string[];
  confidence?: number | null;

  // ✅ NEW: anti-loop memory
  asked_intents?: string[];
  last_customer_intent?: string;
  reask_count_by_intent?: Record<string, number>;
};


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
