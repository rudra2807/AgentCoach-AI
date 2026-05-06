# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository structure

Two independent services:
- `frontend/` — Next.js 16 app (TypeScript, React 19, Tailwind CSS v4). This is where almost all product logic lives.
- `backend/` — FastAPI (Python) stub. Currently only exposes a `/health-check` endpoint; real API logic is in Next.js route handlers.

## Commands

### Frontend

```bash
cd frontend
npm run dev       # start dev server on localhost:3000
npm run build     # production build
npm run lint      # ESLint
```

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip && pip install -r requirements.txt
uvicorn main:app --reload   # run from backend/app/
```

> The backend `main.py` is at `backend/app/main.py`. Run uvicorn from that directory or use `uvicorn app.main:app --reload` from `backend/`.

## Required environment variables

All in `frontend/.env.local`:

```
OPENAI_API_KEY=

# Firebase client (public)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (server-side) — one of:
SERVICE_ACCOUNT_JSON=          # JSON string of service account key
GOOGLE_APPLICATION_CREDENTIALS= # path to service account key file
```

Firebase Admin falls back to `app/lib/serviceAccountKey.json` if neither env var is set (development only — this file should not be in source control).

## System dependencies

`ffmpeg` must be installed and on `PATH` for video-to-audio extraction (`/api/extract-audio`).

## Architecture: data flows

### Upload & Analyze flow (`/`)
1. User selects audio (mp3/wav/m4a) or video (mp4/mov).
2. If video: POST to `/api/extract-audio` → ffmpeg extracts mono 16kHz WAV.
3. POST to `/api/transcribe` → OpenAI `gpt-4o-transcribe` → transcript stored in Firestore (`transcripts` collection).
4. POST to `/api/analyze` → GPT-4o returns structured JSON: `overall_score` (0–10), `clarity_score`, `discovery_score`, `rapport_score`, plus `what_worked`, `what_hurt_conversion`, `missed_opportunity`, `what_to_say_instead`.

### Roleplay flow (`/roleplay`)
1. User selects a scenario from `app/lib/roleplay/scenarios.ts`.
2. POST to `/api/roleplay/realtime-token` → calls OpenAI `/v1/realtime/sessions` with scenario-derived instructions from `app/lib/roleplay/prompt.ts` → returns ephemeral `client_secret`.
3. Frontend establishes a WebRTC `RTCPeerConnection` directly to `api.openai.com/v1/realtime` using the ephemeral token. A data channel (`oai-events`) handles real-time transcript events.
4. The AI bot follows scripted `beats` (opener → pushbacks → ender) defined per scenario; `requestNextBotLine()` fires on each agent turn.
5. After "End & Analyze": POST full transcript to `/api/roleplay/analyze-session` → GPT-4o scores 6 categories (total 0–100):
   - conversation_control (0–15)
   - emotional_calibration (0–15)
   - market_intelligence (0–20)
   - authority_confidence (0–20)
   - objection_handling (0–20)
   - strategic_close (0–10)

### Firebase usage
- **Auth**: anonymous sign-in on page load; `uid` is sent with every transcription.
- **Firestore**: `users` collection (heartbeat, transcript count), `transcripts` collection (full transcript text, segments, duration, conversation type).

## Key files

| File | Purpose |
|------|---------|
| `frontend/app/lib/roleplay/scenarios.ts` | All roleplay scenario definitions (`RoleplayScenario` type, `SCENARIOS` array, `DEFAULT_SCENARIO_ID`) |
| `frontend/app/lib/roleplay/prompt.ts` | Builds OpenAI Realtime session instructions and opening lines from a scenario |
| `frontend/app/api/roleplay/realtime-token/route.ts` | Issues ephemeral OpenAI Realtime token, embeds scenario instructions |
| `frontend/app/api/roleplay/analyze-session/route.ts` | Scores roleplay transcripts with GPT-4o |
| `frontend/app/api/transcribe/route.ts` | Whisper transcription + Firestore write |
| `frontend/app/api/analyze/route.ts` | GPT-4o conversation analysis for the upload flow |

## Adding a new roleplay scenario

1. Add an entry to `SCENARIOS` in `app/lib/roleplay/scenarios.ts` with a unique `id`, `role` ("buyer" or "seller"), `persona`, `context`, `hidden`, `behavior`, and `beats` (or `opener`).
2. No other changes needed — the scenario picker, token creation, and bot turn logic all derive from the `SCENARIOS` array automatically.
