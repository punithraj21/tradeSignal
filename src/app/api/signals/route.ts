import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { loadAppConfigFromDb } from "@/lib/get-app-config";
import type { TradeSignal } from "@/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const config = await loadAppConfigFromDb();
  const defaultLimit = Number(config.signalsLimit) || 50;
  const limit = Math.min(Number(searchParams.get("limit")) || defaultLimit, 500);
  const symbol = searchParams.get("symbol");

  try {
    let query = adminDb
      .collection("tradeSignals")
      .orderBy("createdAt", "desc")
      .limit(limit);

    if (symbol) {
      query = adminDb
        .collection("tradeSignals")
        .where("symbol", "==", symbol.toUpperCase())
        .orderBy("createdAt", "desc")
        .limit(limit);
    }

    const snapshot = await query.get();
    const signals = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<TradeSignal, "id">),
    }));

    return NextResponse.json({ signals, count: signals.length });
  } catch (error) {
    console.error("[api/signals] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch signals" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const collectionRef = adminDb.collection("tradeSignals");
    const batchSize = 500;
    let totalDeleted = 0;

    let snapshot = await collectionRef.limit(batchSize).get();
    while (!snapshot.empty) {
      const batch = adminDb.batch();
      for (const doc of snapshot.docs) {
        batch.delete(doc.ref);
      }
      await batch.commit();
      totalDeleted += snapshot.docs.length;
      snapshot = await collectionRef.limit(batchSize).get();
    }

    return NextResponse.json({
      deleted: totalDeleted,
      message: `Cleared ${totalDeleted} signals.`,
    });
  } catch (error) {
    console.error("[api/signals] DELETE Error:", error);
    return NextResponse.json(
      { error: "Failed to clear signals" },
      { status: 500 }
    );
  }
}
