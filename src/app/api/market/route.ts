import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import type { TradeSignal } from "@/types";

export async function GET() {
  try {
    const snapshot = await adminDb
      .collection("tradeSignals")
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    const signals = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<TradeSignal, "id">),
    }));

    const symbols = [...new Set(signals.map((s) => s.symbol))];

    return NextResponse.json({
      symbols,
      latestSignals: signals,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("[api/market] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch market data" },
      { status: 500 }
    );
  }
}
