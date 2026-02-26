import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

const COLLECTION = "holdings";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    const body = await request.json();
    const { qty, avgBuyPrice, currentPrice, buySource } = body as {
      qty?: number;
      avgBuyPrice?: number;
      currentPrice?: number;
      buySource?: string;
    };

    const ref = adminDb.collection(COLLECTION).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return NextResponse.json({ error: "Holding not found" }, { status: 404 });

    const d = doc.data()!;
    if (d.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    let finalQty = d.qty;
    let finalAvg = d.avgBuyPrice;
    let finalCurrent = d.currentPrice;

    if (typeof qty === "number" && qty >= 0) {
      finalQty = qty;
      updates.qty = qty;
    }
    if (typeof avgBuyPrice === "number" && avgBuyPrice > 0) {
      finalAvg = avgBuyPrice;
      updates.avgBuyPrice = avgBuyPrice;
    }
    if (typeof currentPrice === "number" && currentPrice >= 0) {
      finalCurrent = currentPrice;
      updates.currentPrice = currentPrice;
    }
    if (typeof buySource === "string") {
      updates.buySource = buySource;
    }

    const pnl = (finalCurrent - finalAvg) * finalQty;
    const pnlPercent = finalAvg ? ((finalCurrent - finalAvg) / finalAvg) * 100 : 0;
    updates.pnl = pnl;
    updates.pnlPercent = pnlPercent;

    await ref.update(updates);
    return NextResponse.json({ id, ...d, ...updates, pnl, pnlPercent });
  } catch (error) {
    console.error("[api/holdings/[id]] PATCH Error:", error);
    return NextResponse.json({ error: "Failed to update holding" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    const ref = adminDb.collection(COLLECTION).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return NextResponse.json({ error: "Holding not found" }, { status: 404 });
    if (doc.data()!.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await ref.delete();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/holdings/[id]] DELETE Error:", error);
    return NextResponse.json({ error: "Failed to delete holding" }, { status: 500 });
  }
}
