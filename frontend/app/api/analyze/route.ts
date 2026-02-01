import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { transcript } = await req.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 },
      );
    }

    const openai = new OpenAI({
      apiKey,
    });

    if (!transcript) {
      return NextResponse.json(
        { error: "No transcript provided" },
        { status: 400 },
      );
    }

    // You are an AI real estate sales coach.

// Rules:
// - Use ONLY the information in the transcript
// - Do NOT invent facts
// - Do NOT repeat transcript verbatim unless quoting evidence
// - Be concise and direct
// - No markdown
// - No emojis
// - No explanations

// Return JSON in this EXACT format:
// {
//   "conversation_summary": "2-3 sentences max",
//   "what_worked": ["", "", ""],
//   "what_hurt_conversion": ["", "", ""],
//   "missed_opportunity": {
//     "type": "value_framing | next_step | objection",
//     "description": ""
//   },
//   "what_to_say_instead": {
//     "rewritten_follow_up": ""
//   }
// }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.25,
      messages: [
        {
          role: "system",
          content: `
You are an AI real estate sales coach.

Rules:

Use ONLY the information in the transcript

Do NOT invent facts

Do NOT repeat transcript verbatim unless quoting evidence

Be concise and direct

No markdown

No emojis

No explanations

All scores must be numeric integers

Scores must be inferred ONLY from the transcript

Scoring rules:

All scores are on a 0–10 scale

0 = very poor / missing

10 = excellent / highly effective

Return JSON in this EXACT format:
{
"overall_score": 0,
"conversation_summary": {
"text": "2-3 sentences max",
"score": 0
},
"what_worked": [
{ "point": "", "score": 0 },
{ "point": "", "score": 0 },
{ "point": "", "score": 0 }
],
"what_hurt_conversion": [
{ "point": "", "severity": 0 },
{ "point": "", "severity": 0 },
{ "point": "", "severity": 0 }
],
"missed_opportunity": {
"type": "value_framing | next_step | objection",
"description": "",
"impact_score": 0
},
"what_to_say_instead": {
"rewritten_follow_up": "",
"confidence_score": 0
}
}
          `.trim(),
        },
        {
          role: "user",
          content: transcript,
        },
      ],
    });

    const raw = completion.choices[0].message.content;

    if (!raw) {
      throw new Error("Empty response from OpenAI");
    }

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      const jsonMatch = raw.match(/\{[\s\S]*\}$/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch (err2) {
          throw new Error("Failed to parse JSON from model output");
        }
      } else {
        throw new Error("Model output is not valid JSON");
      }
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
