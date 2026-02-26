import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import type { Holding } from "@/types";

const COLLECTION = "holdings";

export async function POST(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { symbol, qty, buyPrice, companyName, sector, buySource } = body as {
      symbol: string;
      qty: number;
      buyPrice: number;
      companyName?: string;
      sector?: string;
      buySource?: string;
    };

    if (!symbol || typeof qty !== "number" || qty <= 0 || typeof buyPrice !== "number" || buyPrice <= 0) {
      return NextResponse.json(
        { error: "symbol, qty (positive number), and buyPrice (positive number) required" },
        { status: 400 }
      );
    }

    const existing = await adminDb
      .collection(COLLECTION)
      .where("userId", "==", userId)
      .where("symbol", "==", symbol.toUpperCase())
      .limit(1)
      .get();

    const now = new Date();

    if (!existing.empty) {
      const doc = existing.docs[0];
      const d = doc.data() as Holding;
      const prevQty = d.qty ?? 0;
      const prevAvg = d.avgBuyPrice ?? 0;
      const newQty = prevQty + qty;
      const newAvg = newQty ? (prevAvg * prevQty + buyPrice * qty) / newQty : buyPrice;
      const currentPrice = (d.currentPrice ?? buyPrice);
      const pnl = (currentPrice - newAvg) * newQty;
      const pnlPercent = newAvg ? ((currentPrice - newAvg) / newAvg) * 100 : 0;

      await doc.ref.update({
        qty: newQty,
        avgBuyPrice: newAvg,
        currentPrice,
        pnl,
        pnlPercent,
        sector: sector ?? d.sector ?? "",
        buySource: buySource ?? d.buySource ?? "",
        updatedAt: now,
      });

      const updated = { id: doc.id, ...d, qty: newQty, avgBuyPrice: newAvg, currentPrice, pnl, pnlPercent, buySource: buySource ?? d.buySource, updatedAt: now };
      return NextResponse.json(updated, { status: 200 });
    }

    const holding: Omit<Holding, "id"> = {
      userId,
      symbol: symbol.toUpperCase(),
      qty,
      avgBuyPrice: buyPrice,
      currentPrice: buyPrice,
      pnl: 0,
      pnlPercent: 0,
      sector: sector ?? "",
      buySource: buySource ?? "",
      updatedAt: now,
    };

    const docRef = await adminDb.collection(COLLECTION).add(holding);
    return NextResponse.json({ id: docRef.id, ...holding, companyName: companyName ?? symbol }, { status: 201 });
  } catch (error) {
    console.error("[api/holdings] POST Error:", error);
    return NextResponse.json({ error: "Failed to add holding" }, { status: 500 });
  }
}
