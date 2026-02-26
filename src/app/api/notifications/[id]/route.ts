import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

const COLLECTION = "notifications";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  try {
    const ref = adminDb.collection(COLLECTION).doc(id);
    await ref.update({ readAt: new Date() });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/notifications/[id]] PATCH Error:", error);
    return NextResponse.json({ error: "Failed to mark as read" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  try {
    await adminDb.collection(COLLECTION).doc(id).delete();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/notifications/[id]] DELETE Error:", error);
    return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 });
  }
}
