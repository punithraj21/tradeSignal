import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import type { Holding, Position } from "@/types";

export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const holdingsSnap = await adminDb
      .collection("holdings")
      .where("userId", "==", userId)
      .get();

    const positionsSnap = await adminDb
      .collection("positions")
      .where("userId", "==", userId)
      .get();

    const holdings = holdingsSnap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Holding, "id">),
    }));

    const positions = positionsSnap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Position, "id">),
    }));

    const totalInvested = holdings.reduce(
      (sum, h) => sum + h.avgBuyPrice * h.qty,
      0
    );
    const totalCurrent = holdings.reduce(
      (sum, h) => sum + h.currentPrice * h.qty,
      0
    );

    return NextResponse.json({
      holdings,
      positions,
      summary: {
        totalInvested,
        totalCurrent,
        totalPnl: totalCurrent - totalInvested,
        totalPnlPercent: totalInvested
          ? ((totalCurrent - totalInvested) / totalInvested) * 100
          : 0,
      },
    });
  } catch (error) {
    console.error("[api/portfolio] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch portfolio" },
      { status: 500 }
    );
  }
}
