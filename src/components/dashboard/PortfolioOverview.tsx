"use client";

import { useEffect } from "react";
import { useTradingStore } from "@/store/trading.store";

export function PortfolioOverview() {
  const userId = useTradingStore((s) => s.userId);
  const holdings = useTradingStore((s) => s.holdings);
  const positions = useTradingStore((s) => s.positions);
  const setHoldings = useTradingStore((s) => s.setHoldings);
  const setPositions = useTradingStore((s) => s.setPositions);

  useEffect(() => {
    if (!userId) return;

    async function fetchPortfolio() {
      try {
        const res = await fetch("/api/portfolio", {
          headers: { "x-user-id": userId! },
        });
        if (!res.ok) return;
        const data = await res.json();
        setHoldings(data.holdings ?? []);
        setPositions(data.positions ?? []);
      } catch {
        // Will retry on next render cycle
      }
    }

    fetchPortfolio();
  }, [userId, setHoldings, setPositions]);

  const totalInvested = holdings.reduce(
    (s, h) => s + h.avgBuyPrice * h.qty,
    0
  );
  const totalCurrent = holdings.reduce(
    (s, h) => s + h.currentPrice * h.qty,
    0
  );
  const totalPnl = totalCurrent - totalInvested;
  const totalPnlPct = totalInvested ? (totalPnl / totalInvested) * 100 : 0;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
      <div className="border-b border-zinc-800 px-5 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
          Portfolio
        </h2>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-px border-b border-zinc-800 bg-zinc-800">
        <SummaryCard label="Invested" value={formatINR(totalInvested)} />
        <SummaryCard label="Current" value={formatINR(totalCurrent)} />
        <SummaryCard
          label="P&L"
          value={`${totalPnl >= 0 ? "+" : ""}${formatINR(totalPnl)}`}
          color={totalPnl >= 0 ? "emerald" : "red"}
        />
        <SummaryCard
          label="Returns"
          value={`${totalPnlPct >= 0 ? "+" : ""}${totalPnlPct.toFixed(2)}%`}
          color={totalPnlPct >= 0 ? "emerald" : "red"}
        />
      </div>

      {/* Holdings list */}
      {holdings.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-sm text-zinc-600">
          No holdings yet
        </div>
      ) : (
        <div className="max-h-64 overflow-y-auto">
          {holdings.map((h) => (
            <div
              key={h.id ?? h.symbol}
              className="flex items-center justify-between border-b border-zinc-800/50 px-5 py-3"
            >
              <div>
                <div className="text-sm font-medium">{h.symbol}</div>
                <div className="text-xs text-zinc-500">
                  {h.qty} @ {h.avgBuyPrice.toFixed(2)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm tabular-nums">
                  {h.currentPrice.toFixed(2)}
                </div>
                <div
                  className={`text-xs tabular-nums ${
                    h.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {h.pnl >= 0 ? "+" : ""}
                  {h.pnl.toFixed(2)} ({h.pnlPercent.toFixed(2)}%)
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Positions count */}
      {positions.length > 0 && (
        <div className="px-5 py-3 text-xs text-zinc-500">
          {positions.length} open position{positions.length > 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: "emerald" | "red";
}) {
  const textColor =
    color === "emerald"
      ? "text-emerald-400"
      : color === "red"
        ? "text-red-400"
        : "text-zinc-100";

  return (
    <div className="bg-zinc-900/50 px-5 py-4">
      <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className={`mt-1 text-lg font-semibold tabular-nums ${textColor}`}>
        {value}
      </div>
    </div>
  );
}

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
