import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { spawn } from "child_process";

export const runtime = "nodejs";

const MAX_BYTES = 200 * 1024 * 1024; // 200MB upload limit

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileSize =
      (file as any).size ?? Buffer.byteLength(await file.arrayBuffer());
    if (fileSize > MAX_BYTES) {
      return NextResponse.json(
        { error: `File too large (max ${MAX_BYTES} bytes)` },
        { status: 413 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const tmpDir = os.tmpdir();
    const originalName = (file as any).name || `upload-${Date.now()}.mp4`;
    const ext =
      path.extname(originalName) ||
      (file.type ? `.${file.type.split("/").pop()}` : ".mp4");
    const videoPath = path.join(
      tmpDir,
      `video-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`,
    );
    const audioPath = path.join(
      tmpDir,
      `audio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.wav`,
    );

    await fs.writeFile(videoPath, buffer);

    // Run ffmpeg via spawn to avoid shell interpolation and support arbitrary input containers
    await new Promise<void>((resolve, reject) => {
      const args = [
        "-y",
        "-i",
        videoPath,
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        audioPath,
      ];
      const ff = spawn("ffmpeg", args);

      let stderr = "";
      ff.stderr.on("data", (d) => (stderr += d.toString()));
      ff.on("error", (err) => reject(err));
      ff.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg failed (code=${code}): ${stderr}`));
      });
    });

    const audioBuffer = await fs.readFile(audioPath);

    // best-effort cleanup
    try {
      await fs.unlink(videoPath);
    } catch (e) {}
    try {
      await fs.unlink(audioPath);
    } catch (e) {}

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Disposition": `attachment; filename="extracted.wav"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Extraction failed" }, { status: 500 });
  }
}
