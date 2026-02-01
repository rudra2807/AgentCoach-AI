import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "@/app/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { user_id } = await req.json();

    if (!user_id || typeof user_id !== "string") {
      return NextResponse.json({ error: "Invalid user_id" }, { status: 400 });
    }

    const userRef = db.collection("users").doc(user_id);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);

      if (!snap.exists) {
        tx.set(userRef, {
          created_at: Timestamp.now(),
          last_seen_at: Timestamp.now(),
          transcript_count: 0,
        });
      } else {
        tx.update(userRef, {
          last_seen_at: Timestamp.now(),
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "User heartbeat failed" },
      { status: 500 },
    );
  }
}
