import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { loadAppConfigFromDb } from "@/lib/get-app-config";
import type { NotificationRecord } from "@/types";

const COLLECTION = "notifications";

function fromDoc(
  doc: { id: string; data: () => Record<string, unknown> }
): NotificationRecord & { id: string } {
  const d = doc.data();
  const createdAt = d?.createdAt as Date | { seconds: number } | undefined;
  const readAt = d?.readAt as Date | { seconds: number } | null | undefined;
  return {
    id: doc.id,
    userId: (d?.userId as string) ?? "",
    type: (d?.type as NotificationRecord["type"]) ?? "info",
    title: (d?.title as string) ?? "",
    message: (d?.message as string) ?? "",
    symbol: d?.symbol as string | undefined,
    priority: (d?.priority as NotificationRecord["priority"]) ?? "normal",
    readAt: readAt
      ? readAt instanceof Date
        ? readAt
        : new Date((readAt as { seconds: number }).seconds * 1000)
      : null,
    createdAt: createdAt
      ? createdAt instanceof Date
        ? createdAt
        : new Date((createdAt as { seconds: number }).seconds * 1000)
      : new Date(),
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const config = await loadAppConfigFromDb();
  const defaultLimit = Number(config.notificationsLimit) || 50;
  const limit = Math.min(Number(searchParams.get("limit")) || defaultLimit, 500);

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  try {
    const snapshot = await adminDb
      .collection(COLLECTION)
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const notifications = snapshot.docs.map((doc) =>
      fromDoc({ id: doc.id, data: () => doc.data() })
    );
    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("[api/notifications] GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, type, title, message, symbol, priority } = body;

    if (!userId || !title) {
      return NextResponse.json({ error: "userId and title required" }, { status: 400 });
    }

    const data = {
      userId,
      type: type ?? "info",
      title,
      message: message ?? "",
      symbol: symbol ?? null,
      priority: priority ?? "normal",
      readAt: null,
      createdAt: new Date(),
    };

    const docRef = await adminDb.collection(COLLECTION).add(data);
    return NextResponse.json({ id: docRef.id, ...data }, { status: 201 });
  } catch (error) {
    console.error("[api/notifications] POST Error:", error);
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  try {
    const config = await loadAppConfigFromDb();
    const batchSize = Math.min(Number(config.maxNotificationsDeleteBatch) || 500, 1000);
    const snapshot = await adminDb
      .collection(COLLECTION)
      .where("userId", "==", userId)
      .limit(batchSize)
      .get();

    const batch = adminDb.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    return NextResponse.json({ deleted: snapshot.size });
  } catch (error) {
    console.error("[api/notifications] DELETE all Error:", error);
    return NextResponse.json({ error: "Failed to clear notifications" }, { status: 500 });
  }
}
