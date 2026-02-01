import { NextResponse } from "next/server";
import OpenAI from "openai";
import mime from "mime";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const conversationType =
      (formData.get("conversation_type") as string) || "unknown";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    const blob = new Blob([buffer], { type: file.type });

    const transcription = await openai.audio.transcriptions.create({
      file: blob,
      model: "gpt-4o-transcribe",
      response_format: "verbose_json",
      // IMPORTANT: no interpretation here
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

    // You will NOT get speaker attribution from the transcribe model.
    // Do NOT pretend you do.
    return NextResponse.json({
      conversation_type: conversationType,
      duration_minutes: transcription.duration
        ? Math.round((transcription.duration / 60) * 10) / 10
        : null,
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

  //     const model = "gemini-2.5-flash";

  //     const contents = [
  //       {
  //         role: "user",
  //         parts: [
  //           {
  //             text: `
  // You are transcribing a real estate agent conversation.
  // Conversation type: ${formData.get("conversation_type") || "unknown"}

  // Return a JSON transcript with:
  // - Turn-by-turn speaker segments
  // - Verbatim utterances (do NOT clean or rewrite)
  // - Light best-effort flags only when obvious

  // Rules:
  // - Preserve filler words, repetition, and incomplete thoughts
  // - Do NOT summarize or improve language
  // - Do NOT merge turns
  // - Use speaker values: agent, client, or unknown
  // - If speaker attribution is unclear, use "unknown"

  // Output format:
  // {
  //   "conversation_type": "<provided>",
  //   "duration_minutes": <number>,
  //   "transcript": [
  //     {
  //       "turn_id": <int>,
  //       "speaker": "agent|client|unknown",
  //       "utterance": "<verbatim speech>",
  //       "flags": {
  //         "interruption": true|false,
  //         "hesitation": true|false,
  //         "topic_shift": true|false
  //       }
  //     }
  //   ]
  // }
  // `,
  //           },
  //           {
  //             inlineData: {
  //               data: base64,
  //               mimeType:
  //                 file.type ||
  //                 mime.getType(file.name) ||
  //                 "application/octet-stream",
  //             },
  //           },
  //         ],
  //       },
  //     ];

  //     const response = await ai.models.generateContent({
  //       model,
  //       contents,
  //     });

  //     const text = response.text ?? "";
  //     console.log(text);

  //     // Defensive JSON extraction (important)
  //     const start = text.indexOf("{");
  //     const end = text.lastIndexOf("}");

  //     if (start === -1 || end === -1) {
  //       throw new Error("Gemini did not return JSON");
  //     }

  //     const parsed = JSON.parse(text.slice(start, end + 1));

  //     return NextResponse.json(parsed);
  //   } catch (err) {
  //     console.error(err);
  //     return NextResponse.json(
  //       { error: "Transcription failed" },
  //       { status: 500 },
  //     );
  //   }
}
