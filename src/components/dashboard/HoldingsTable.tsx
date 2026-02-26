"use client";

import { useCallback, useState } from "react";
import { useTradingStore } from "@/store/trading.store";
import type { Holding } from "@/types";
import { EditHoldingModal } from "@/components/dashboard/EditHoldingModal";
import { SellHoldingModal } from "@/components/dashboard/SellHoldingModal";
import { AnalyzeHoldingModal } from "@/components/dashboard/AnalyzeHoldingModal";

function formatINR(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(n);
}

export function HoldingsTable() {
  const userId = useTradingStore((s) => s.userId);
  const holdings = useTradingStore((s) => s.holdings);
  const setHoldings = useTradingStore((s) => s.setHoldings);
  const [editHolding, setEditHolding] = useState<Holding | null>(null);
  const [sellHolding, setSellHolding] = useState<Holding | null>(null);
  const [analyzeHolding, setAnalyzeHolding] = useState<Holding | null>(null);

  const refetch = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch("/api/portfolio", { headers: { "x-user-id": userId } });
      if (res.ok) {
        const data = await res.json();
        setHoldings(data.holdings ?? []);
      }
    } catch {
      // ignore
    }
  }, [userId, setHoldings]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!userId || !id) return;
      try {
        const res = await fetch(`/api/holdings/${id}`, {
          method: "DELETE",
          headers: { "x-user-id": userId },
        });
        if (res.ok) await refetch();
      } catch {
        // ignore
      }
    },
    [userId, refetch]
  );

  if (holdings.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
        <div className="border-b border-zinc-800 px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
            Holdings
          </h2>
          <p className="mt-0.5 text-[11px] text-zinc-600">
            Add stocks via the Buy button on a signal card
          </p>
        </div>
        <div className="flex h-32 items-center justify-center text-sm text-zinc-600">
          No holdings yet
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
      <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
            Holdings
          </h2>
          <p className="mt-0.5 text-[11px] text-zinc-600">
            {holdings.length} position{holdings.length !== 1 ? "s" : ""} — we check profit/loss at your set interval
          </p>
        </div>
        <button
          onClick={refetch}
          className="rounded-md border border-zinc-700 px-2.5 py-1.5 text-[11px] font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
        >
          Refresh
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              <th className="px-5 py-3">Symbol</th>
              <th className="px-5 py-3">Bought via</th>
              <th className="px-5 py-3 text-right">Qty</th>
              <th className="px-5 py-3 text-right">Avg cost</th>
              <th className="px-5 py-3 text-right">Total invested</th>
              <th className="px-5 py-3 text-right">Current</th>
              <th className="px-5 py-3 text-right">P&L %</th>
              <th className="px-2 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((h) => (
              <HoldingRow
                key={h.id ?? h.symbol}
                holding={h}
                isAnalyzing={!!analyzeHolding && (analyzeHolding.id === h.id || analyzeHolding.symbol === h.symbol)}
                onDelete={handleDelete}
                onEdit={() => setEditHolding(h)}
                onSell={() => setSellHolding(h)}
                onAnalyze={() => setAnalyzeHolding(h)}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-zinc-800 px-5 py-3 text-right text-sm">
        <span className="text-zinc-500">Total invested: </span>
        <span className="font-semibold tabular-nums text-zinc-200">
          {formatINR(holdings.reduce((sum, h) => sum + (h.qty ?? 0) * (h.avgBuyPrice ?? 0), 0))}
        </span>
      </div>

      {editHolding && (
        <EditHoldingModal
          isOpen={!!editHolding}
          onClose={() => setEditHolding(null)}
          holding={editHolding}
          userId={userId}
          onSuccess={refetch}
        />
      )}
      {sellHolding && (
        <SellHoldingModal
          isOpen={!!sellHolding}
          onClose={() => setSellHolding(null)}
          holding={sellHolding}
          userId={userId}
          onSuccess={refetch}
        />
      )}
      {analyzeHolding && (
        <AnalyzeHoldingModal
          isOpen={!!analyzeHolding}
          onClose={() => setAnalyzeHolding(null)}
          symbol={analyzeHolding.symbol}
          companyName={analyzeHolding.symbol}
        />
      )}
    </div>
  );
}

function HoldingRow({
  holding,
  isAnalyzing,
  onDelete,
  onEdit,
  onSell,
  onAnalyze,
}: {
  holding: Holding;
  isAnalyzing: boolean;
  onDelete: (id: string) => void;
  onEdit: () => void;
  onSell: () => void;
  onAnalyze: () => void;
}) {
  const id = holding.id ?? holding.symbol;
  const pnlPercent = holding.pnlPercent ?? 0;
  const totalInvested = (holding.qty ?? 0) * (holding.avgBuyPrice ?? 0);

  return (
    <tr className="border-b border-zinc-800/50 transition-colors hover:bg-zinc-800/30">
      <td className="px-5 py-3 font-medium text-zinc-200">{holding.symbol}</td>
      <td className="px-5 py-3 text-zinc-500">{holding.buySource || "—"}</td>
      <td className="px-5 py-3 text-right tabular-nums text-zinc-300">{holding.qty}</td>
      <td className="px-5 py-3 text-right tabular-nums text-zinc-400">
        {formatINR(holding.avgBuyPrice)}
      </td>
      <td className="px-5 py-3 text-right tabular-nums text-zinc-300">
        {formatINR(totalInvested)}
      </td>
      <td className="px-5 py-3 text-right tabular-nums text-zinc-300">
        {formatINR(holding.currentPrice)}
      </td>
      <td
        className={`px-5 py-3 text-right tabular-nums ${
          pnlPercent >= 0 ? "text-emerald-400" : "text-red-400"
        }`}
      >
        {pnlPercent >= 0 ? "+" : ""}
        {pnlPercent.toFixed(2)}%
      </td>
      <td className="px-2 py-3">
        <div className="flex items-center gap-0.5">
          <button
            onClick={onAnalyze}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-700 hover:text-blue-400"
            title={isAnalyzing ? "Analyzing…" : "AI analysis"}
          >
            {isAnalyzing ? (
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
            ) : (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            )}
          </button>
          <button
            onClick={onEdit}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-700 hover:text-amber-400"
            title="Edit"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={onSell}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-700 hover:text-red-400"
            title="Sell"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(id)}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-700 hover:text-red-400"
            title="Remove holding"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}
