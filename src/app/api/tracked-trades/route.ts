import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import type { TrackedTrade } from "@/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  try {
    const snapshot = await adminDb
      .collection("trackedTrades")
      .where("userId", "==", userId)
      .orderBy("trackedAt", "desc")
      .limit(50)
      .get();

    const trades = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<TrackedTrade, "id">),
    }));

    return NextResponse.json({ trades, count: trades.length });
  } catch (error) {
    console.error("[api/tracked-trades] GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch tracked trades" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, symbol, companyName, signalId, headline, confidence, profitPossibilityScore } = body;

    if (!userId || !symbol || !signalId) {
      return NextResponse.json({ error: "userId, symbol, signalId required" }, { status: 400 });
    }

    const existing = await adminDb
      .collection("trackedTrades")
      .where("userId", "==", userId)
      .where("symbol", "==", symbol)
      .where("status", "==", "watching")
      .limit(1)
      .get();

    if (!existing.empty) {
      return NextResponse.json({ error: "Already tracking this symbol" }, { status: 409 });
    }

    const trade: Omit<TrackedTrade, "id"> = {
      userId,
      symbol,
      companyName: companyName ?? symbol,
      signalId,
      headline: headline ?? "",
      confidence: confidence ?? 0,
      profitPossibilityScore: profitPossibilityScore ?? 0,
      trackedAt: new Date(),
      status: "watching",
    };

    const docRef = await adminDb.collection("trackedTrades").add(trade);

    return NextResponse.json({ id: docRef.id, ...trade }, { status: 201 });
  } catch (error) {
    console.error("[api/tracked-trades] POST Error:", error);
    return NextResponse.json({ error: "Failed to track trade" }, { status: 500 });
  }
}
