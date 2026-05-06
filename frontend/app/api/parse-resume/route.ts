import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // Require the internal lib directly — index.js runs a test file read on load
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse/lib/pdf-parse");
    const data = await pdfParse(buffer);

    return NextResponse.json({ text: data.text ?? "" });
  } catch (err) {
    console.error("[parse-resume]", err);
    return NextResponse.json({ error: "Failed to parse PDF" }, { status: 500 });
  }
}
