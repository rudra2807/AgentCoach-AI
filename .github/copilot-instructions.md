<!-- Auto-generated guidance for AI coding agents working in this repository. -->

# Copilot instructions — AgentCoach-AI (concise)

This document explains the concrete, discoverable patterns and developer workflows an AI coding agent needs to be immediately productive in this repository.

- **Project layout (big picture):**
  - **Frontend:** Next.js 13+ app at `frontend/` (app router). UI, client-recording, and most serverless endpoints live here. See the API routes under `frontend/app/api/*` (notably `analyze/route.ts`, `transcribe/route.ts`, `heartbeat/route.ts`).
  - **Backend:** Minimal FastAPI app at `backend/` with a health-check in `backend/app/main.py`. It is currently lightweight and not the primary place for AI logic.
  - **Firebase:** Server-side admin helper at `frontend/app/lib/firebase-admin.ts` and service account at `frontend/app/lib/serviceAccountKey.json` (used by API routes for Firestore). Client Firebase config is in `frontend/app/lib/firebase.ts`.

- **Where AI logic lives:**
  - `frontend/app/api/analyze/route.ts` calls OpenAI chat completions and embeds a strict `system` prompt that dictates exact JSON output. When editing or adding analyzers, preserve the JSON schema and rules in that prompt.
  - `frontend/app/api/transcribe/route.ts` uses OpenAI audio transcription and stores transcripts in Firestore. The route enforces a 20MB upload limit and expects `FormData` with `file`, `user_id`, and `conversation_type`.

- **Key patterns and conventions (concrete):**
  - Server-side Next.js route files use `export const runtime = "nodejs";` — keep that when adding node-specific libs (e.g., `openai`, `firebase-admin`).
  - System prompts are authoritative: they include rules (e.g., “Use ONLY the information in the transcript”, output JSON schema). Do not change existing prompt schemas unless intentionally changing the API contract; when augmenting, update both the prompt and any downstream JSON parsing code.
  - Transcription flow: client records via `components/AudioRecorder.tsx` + `hooks/useAudioRecorder.ts` → uploads via `transcribe` route → transcript saved in `transcripts` Firestore collection. Keep field names consistent (`transcript_text`, `segments`, `duration_minutes`, `user_id`).
  - Analyze flow: the analyze route expects `transcript` (string) in JSON and returns a JSON object parsed from the model’s string output. Code currently parses `completion.choices[0].message.content` as JSON — ensure model output is valid JSON.

- **Important files to reference when making changes:**
  - [frontend/app/api/analyze/route.ts](../frontend/app/api/analyze/route.ts) — example chat-completion usage and strict output schema.
  - [frontend/app/api/transcribe/route.ts](../frontend/app/api/transcribe/route.ts) — audio upload, OpenAI transcription, Firestore writes, 20MB limit.
  - [frontend/app/api/heartbeat/route.ts](../frontend/app/api/heartbeat/route.ts) — user heartbeat pattern and Firestore transaction usage.
  - [frontend/app/lib/firebase-admin.ts](../frontend/app/lib/firebase-admin.ts) and [frontend/app/lib/serviceAccountKey.json](../frontend/app/lib/serviceAccountKey.json) — admin credential loading for server-side code.
  - [frontend/components/AudioRecorder.tsx](../frontend/components/AudioRecorder.tsx) and [frontend/hooks/useAudioRecorder.ts](../frontend/hooks/useAudioRecorder.ts) — client recording/upload UX and file shape (webm).
- **Environment and secrets (what to set / watch):**
  - `OPENAI_API_KEY` — used in server-side Next routes.
  - `NEXT_PUBLIC_FIREBASE_*` client env vars for the Firebase SDK (see `frontend/app/lib/firebase.ts`).
  - `serviceAccountKey.json` is present in `frontend/app/lib/` (this repo currently contains the file). Treat it as sensitive; prefer replacing with mounted secrets in production.

- **Dev / build / run commands (concrete):**
  - Frontend (Next.js): `npm run dev` (dev), `npm run build` (build), `npm start` (start). See `frontend/package.json`.
  - Backend (FastAPI): activate virtualenv, install `requirements.txt`, run `uvicorn main:app --reload` from `backend/app` as documented in `backend/README.md`.

- **Testing / debugging hints:**
  - When debugging transcription or analyze routes, replicate client requests using `curl` or a small Node script that posts `FormData` for `transcribe` and JSON for `analyze` (check `transcribe` expects `multipart/form-data`).
  - If an analyzer fails JSON.parse, examine the model output for stray text. The code assumes the model returns raw JSON string (no extra commentary).

- **When changing prompts or model settings:**
  - Update the system prompt and the code that parses the model output together. Example: `analyze/route.ts` uses `model: "gpt-4o"` and then `JSON.parse(raw)` — changing model or output format requires updating parsing and tests.

- **Files that are intentionally minimal / TODOs:**
  - `backend/app/api/routes.py` and `backend/app/core/config.py` are present but empty — backend currently provides minimal functionality; prefer extending frontend server routes unless you intentionally split responsibilities.

- **Small examples (concrete snippets to follow when adding features):**
  - Upload flow (client → transcribe): send `FormData` fields: `file` (File), `user_id` (string), `conversation_type` (string).
  - Analyze flow (server expects): POST JSON `{ "transcript": "..." }` and returns parsed JSON object matching the schema in `analyze/route.ts`.

If anything in this file is unclear or you need more details (for example, missing env vars or intended feature surface for the backend), tell me which area to expand and I will update this guidance accordingly.
