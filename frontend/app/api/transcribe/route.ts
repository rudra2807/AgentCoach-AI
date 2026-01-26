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
      apiKey: "AIzaSyCk4wQghdJDv92cJYetJYNqCIXc196K1Jw",
    });

    const model = "gemini-2.5-flash";

    const contents = [
      {
        role: "user",
        parts: [
          {
            text: `
You are a transcription engine for real estate conversations.

TASK:
1. Transcribe the audio/video accurately.
2. Perform speaker diarization with TWO speakers:
   - "Agent"
   - "Client"
3. Infer speakers based on conversational context.
4. Provide APPROXIMATE timestamps (mm:ss). Accuracy within ~5 seconds is acceptable.
5. Split the transcript into short conversational segments.

RETURN ONLY VALID JSON in this exact format:

{
  "segments": [
    {
      "speaker": "Agent | Client",
      "start": "mm:ss",
      "end": "mm:ss",
      "text": "spoken text"
    }
  ],
  "full_transcript": "complete transcript text"
}

IMPORTANT RULES:
- Do not include explanations.
- Do not include markdown.
- Do not include extra keys.
- If unsure about speaker, choose the most likely one.
- return valid JSON only.
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
