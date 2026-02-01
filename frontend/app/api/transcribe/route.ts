import { NextResponse } from "next/server";
import OpenAI from "openai";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { db } from "@/app/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const userID = (formData.get("user_id") as string) || "unknown";
    const conversationType =
      (formData.get("conversation_type") as string) || "unknown";
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    console.log("formData keys:", [...formData.keys()]);

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 20MB)" },
        { status: 413 },
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 },
      );
    }

    const openai = new OpenAI({ apiKey });

    const buffer = Buffer.from(await file.arrayBuffer());
    const openaiFile = new File([buffer], file.name || "audio", {
      type: file.type,
    });

    const transcription = await openai.audio.transcriptions.create({
      file: openaiFile,
      model: "gpt-4o-transcribe",
      response_format: "json",
      prompt: `
You are transcribing a real estate conversation.
Rules:
- Verbatim transcription only
- Preserve filler words, repetition, false starts
- Do NOT summarize
- Do NOT infer intent
- Do NOT add coaching
      `.trim(),
    });

    // Normalize transcription response shapes across diarized variants
    const raw: any = transcription as any;
    const transcriptText: string = raw.text ?? raw.transcript ?? "";

    // Normalize segments (array, JSON string, or nested)
    let segments: any[] = [];
    if (Array.isArray(raw.segments)) {
      segments = raw.segments;
    } else if (typeof raw.segments === "string") {
      try {
        const parsed = JSON.parse(raw.segments);
        if (Array.isArray(parsed)) segments = parsed;
      } catch (e) {
        // ignore parse error
      }
    } else if (raw.diarization && Array.isArray(raw.diarization.segments)) {
      segments = raw.diarization.segments;
    } else if (raw.data && Array.isArray(raw.data.segments)) {
      segments = raw.data.segments;
    }

    // Compute duration: prefer explicit duration, else infer from segments
    let durationSeconds: number | null = null;
    if (typeof raw.duration === "number") {
      durationSeconds = raw.duration;
    } else if (Array.isArray(segments) && segments.length > 0) {
      const maxEnd = segments.reduce((acc, s) => {
        const candidate = s.end ?? s.end_time ?? s.end_seconds ?? s.to ?? null;
        const num =
          typeof candidate === "number"
            ? candidate
            : parseFloat(candidate) || 0;
        return Math.max(acc, num);
      }, 0);
      if (maxEnd > 0) durationSeconds = maxEnd;
    }

    const durationMinutes = durationSeconds
      ? Math.round((durationSeconds / 60) * 10) / 10
      : null;

    const docRef = await db.collection("transcripts").add({
      user_id: userID,
      conversation_type: conversationType,
      transcript_text: transcriptText,
      segments: segments ?? [],
      duration_minutes: durationMinutes,
      created_at: Timestamp.now(),
      source: "upload",
    });

    await db
      .collection("users")
      .doc(userID)
      .set(
        {
          last_seen_at: Timestamp.now(),
          transcript_count: FieldValue.increment(1),
        },
        { merge: true },
      );

    return NextResponse.json({
      user_id: userID,
      transcript_id: docRef.id,
      conversation_type: conversationType,
      duration_minutes: durationMinutes,
      transcript_text: transcriptText,
      segments: segments ?? [],
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Transcription failed" },
      { status: 500 },
    );
  }
}
