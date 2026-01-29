import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import mime from "mime";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || "",
    });

    const model = "gemini-2.5-flash";

    const contents = [
      {
        role: "user",
        parts: [
          {
            text: `
You are transcribing a real estate agent conversation.
Conversation type: ${formData.get("conversation_type") || "unknown"}

Return a JSON transcript with:
- Turn-by-turn speaker segments
- Verbatim utterances (do NOT clean or rewrite)
- Light best-effort flags only when obvious

Rules:
- Preserve filler words, repetition, and incomplete thoughts
- Do NOT summarize or improve language
- Do NOT merge turns
- Use speaker values: agent, client, or unknown
- If speaker attribution is unclear, use "unknown"

Output format:
{
  "conversation_type": "<provided>",
  "duration_minutes": <number>,
  "transcript": [
    {
      "turn_id": <int>,
      "speaker": "agent|client|unknown",
      "utterance": "<verbatim speech>",
      "flags": {
        "interruption": true|false,
        "hesitation": true|false,
        "topic_shift": true|false
      }
    }
  ]
}
`,
          },
          {
            inlineData: {
              data: base64,
              mimeType:
                file.type ||
                mime.getType(file.name) ||
                "application/octet-stream",
            },
          },
        ],
      },
    ];

    const response = await ai.models.generateContent({
      model,
      contents,
    });

    const text = response.text ?? "";
    console.log(text);

    // Defensive JSON extraction (important)
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");

    if (start === -1 || end === -1) {
      throw new Error("Gemini did not return JSON");
    }

    const parsed = JSON.parse(text.slice(start, end + 1));

    return NextResponse.json(parsed);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Transcription failed" },
      { status: 500 },
    );
  }
}
