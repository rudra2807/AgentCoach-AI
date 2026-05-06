import { NextResponse } from "next/server";
import { buildInterviewSessionInstructions } from "@/app/lib/interview/prompt";
import type { InterviewType } from "@/app/lib/interview/types";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const jdText: string = typeof body?.jd_text === "string" ? body.jd_text.trim() : "";
    const resumeText: string = typeof body?.resume_text === "string" ? body.resume_text.trim() : "";
    const interviewType: InterviewType =
      typeof body?.interviewType === "string" ? body.interviewType : "Behavioral";

    if (!jdText) {
      return NextResponse.json(
        { error: "jd_text is required" },
        { status: 400 }
      );
    }

    const instructions = buildInterviewSessionInstructions(jdText, resumeText, interviewType);

    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-realtime",
        voice: "alloy",
        instructions,
      }),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to create realtime session" },
      { status: 500 }
    );
  }
}
