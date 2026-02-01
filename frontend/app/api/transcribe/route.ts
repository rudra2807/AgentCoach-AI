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
    const blob = new Blob([buffer], { type: file.type });

    const transcription = await openai.audio.transcriptions.create({
      file: blob,
      model: "gpt-4o-transcribe",
      response_format: "verbose_json",
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

    const durationMinutes = transcription.duration
      ? Math.round((transcription.duration / 60) * 10) / 10
      : null;

    const docRef = await db.collection("transcripts").add({
      user_id: userID,
      conversation_type: conversationType,
      transcript_text: transcription.text,
      segments: transcription.segments ?? [],
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
      transcript_text: transcription.text,
      segments: transcription.segments ?? [],
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Transcription failed" },
      { status: 500 },
    );
  }
}
