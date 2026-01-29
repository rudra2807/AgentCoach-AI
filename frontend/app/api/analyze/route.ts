import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const reqJson = await req.json();
    const transcriptText = reqJson.transcript;

    if (!transcriptText) {
      return NextResponse.json(
        { error: "No transcript provided" },
        { status: 400 },
      );
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || "",
    });

    const model = "gemini-2.5-flash";

    const instruction = `
You are an AI real estate sales coach.

You will be given a structured transcript of a real estate conversation.
Analyze it and return structured coaching.

Rules:
- Use ONLY the information in the transcript
- Do NOT invent facts
- Do NOT repeat transcript verbatim unless quoting evidence
- Be concise and direct
- No markdown, no emojis, no explanations

Return JSON in this exact format:
{
    "conversation_summary": "2-3 sentences max",
    "what_worked": ["", "", ""],
    "what_hurt_conversion": ["", "", ""],
    "missed_opportunity": {
        "type": "value_framing | next_step | objection",
        "description": ""
    },
    "what_to_say_instead": {
        "rewritten_follow_up": ""
    }
}
`;

    const contents = [
      {
        role: "user",
        parts: [{ text: instruction }, { text: transcriptText }],
      },
    ];

    const response = await ai.models.generateContent({
      model,
      contents,
    });

    const text = response.text ?? "";
    console.log(text);

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
