import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const docRef = adminDb.collection("tradeSignals").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Signal not found" }, { status: 404 });
    }

    await docRef.delete();
    return NextResponse.json({ deleted: id });
  } catch (error) {
    console.error("[api/signals/[id]] DELETE Error:", error);
    return NextResponse.json(
      { error: "Failed to delete signal" },
      { status: 500 }
    );
  }
}
