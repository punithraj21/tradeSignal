import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getPrices } from "@/lib/price-source";
import { loadAppConfigFromDb } from "@/lib/get-app-config";
import { sendDiscordNotification } from "@/lib/discord";

const HOLDINGS = "holdings";
const NOTIFICATIONS = "notifications";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Optional: require cron secret to prevent public calls
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const config = await loadAppConfigFromDb();
    const profitThreshold = Number(config.profitThresholdPercent);
    const lossThreshold = Number(config.lossThresholdPercent);
    const cooldownHours = Number(config.thresholdCooldownHours);
    const thresholdCooldownMs = cooldownHours * 60 * 60 * 1000;

    const batchSize = Math.min(Math.max(1, Number(config.maxCronHoldingsBatch) || 500), 2000);
    const holdingsSnap = await adminDb.collection(HOLDINGS).limit(batchSize).get();
    if (holdingsSnap.empty) {
      return NextResponse.json({ ok: true, updated: 0, notified: 0 });
    }

    const symbols = [...new Set(holdingsSnap.docs.map((d) => (d.data().symbol as string) || "").filter(Boolean))];
    const yahooChartBaseUrl = String(config.yahooChartBaseUrl ?? "").trim();
    const prices = yahooChartBaseUrl ? await getPrices(symbols, yahooChartBaseUrl) : {};

    let updated = 0;
    const toNotify: { holdingId: string; userId: string; symbol: string; pnlPercent: number; qty: number; avgBuyPrice: number; currentPrice: number }[] = [];

    const now = new Date();
    const nowMs = now.getTime();

    for (const doc of holdingsSnap.docs) {
      const d = doc.data();
      const symbol = (d.symbol as string) || "";
      const userId = d.userId as string;
      const qty = Number(d.qty) || 0;
      const avgBuyPrice = Number(d.avgBuyPrice) || 0;
      let currentPrice = Number(d.currentPrice) || avgBuyPrice;
      const lastNotified = (d.lastThresholdNotifiedAt?.toDate?.() ?? d.lastThresholdNotifiedAt) as Date | undefined;
      const lastNotifiedMs = lastNotified ? new Date(lastNotified).getTime() : 0;

      if (symbol && prices[symbol] != null && prices[symbol] > 0) {
        currentPrice = prices[symbol];
        updated++;
      }

      const pnl = (currentPrice - avgBuyPrice) * qty;
      const pnlPercent = avgBuyPrice ? ((currentPrice - avgBuyPrice) / avgBuyPrice) * 100 : 0;

      await doc.ref.update({
        currentPrice,
        pnl,
        pnlPercent,
        updatedAt: now,
      });

      const overProfit = pnlPercent >= profitThreshold;
      const overLoss = pnlPercent <= lossThreshold;
      const cooldownPassed = nowMs - lastNotifiedMs >= thresholdCooldownMs;
      if ((overProfit || overLoss) && cooldownPassed) {
        toNotify.push({
          holdingId: doc.id,
          userId,
          symbol,
          pnlPercent,
          qty,
          avgBuyPrice,
          currentPrice,
        });
      }
    }

    for (const n of toNotify) {
      const title =
        n.pnlPercent >= 0
          ? `Take profit: ${n.symbol} at +${n.pnlPercent.toFixed(1)}%`
          : `Stop loss: ${n.symbol} at ${n.pnlPercent.toFixed(1)}%`;
      const message = `${n.symbol}: ${n.qty} @ ${n.avgBuyPrice.toFixed(2)} → ${n.currentPrice.toFixed(2)}. Consider selling.`;
      await adminDb.collection(NOTIFICATIONS).add({
        userId: n.userId,
        type: n.pnlPercent >= 0 ? "success" : "sell_alert",
        title,
        message,
        symbol: n.symbol,
        priority: "high",
        readAt: null,
        createdAt: now,
      });
      await adminDb.collection(HOLDINGS).doc(n.holdingId).update({
        lastThresholdNotifiedAt: now,
      });
      await sendDiscordNotification({ title, message, symbol: n.symbol });
    }

    return NextResponse.json({
      ok: true,
      updated,
      notified: toNotify.length,
    });
  } catch (error) {
    console.error("[cron/check-holdings] Error:", error);
    return NextResponse.json(
      { error: "Check holdings failed", message: String(error) },
      { status: 500 }
    );
  }
}
