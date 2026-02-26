"use client";

import { useState, useCallback, useMemo } from "react";
import type { TradeSignal } from "@/types";
import { useTradingStore } from "@/store/trading.store";
import { useAppConfig, parseBuySources } from "@/hooks/use-app-config";

interface BuyModalProps {
  isOpen: boolean;
  onClose: () => void;
  signal: TradeSignal;
  onSuccess: () => void;
}

export function BuyModal({ isOpen, onClose, signal, onSuccess }: BuyModalProps) {
  const userId = useTradingStore((s) => s.userId);
  const setHoldings = useTradingStore((s) => s.setHoldings);
  const addTrackedTrade = useTradingStore((s) => s.addTrackedTrade);
  const pushNotification = useTradingStore((s) => s.pushNotification);
  const { config } = useAppConfig();
  const buySources = useMemo(() => parseBuySources(config), [config]);

  const [qty, setQty] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [buySource, setBuySource] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!userId) return;
      const q = parseInt(qty, 10);
      const p = parseFloat(price);
      if (!Number.isInteger(q) || q <= 0 || !Number.isFinite(p) || p <= 0) {
        setError("Enter valid quantity and price.");
        return;
      }
      setError(null);
      setSubmitting(true);
      try {
        const holdingRes = await fetch("/api/holdings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": userId,
          },
          body: JSON.stringify({
            symbol: signal.symbol,
            qty: q,
            buyPrice: p,
            companyName: signal.companyName || signal.symbol,
            buySource: buySource || undefined,
          }),
        });
        if (!holdingRes.ok) {
          const err = await holdingRes.json().catch(() => ({}));
          setError(err.error || "Failed to add holding");
          return;
        }

        const tradeRes = await fetch("/api/tracked-trades", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            symbol: signal.symbol,
            companyName: signal.companyName,
            signalId: signal.id ?? "",
            headline: signal.headline,
            confidence: signal.confidence,
            profitPossibilityScore: signal.profitPossibilityScore,
          }),
        });
        if (tradeRes.ok) {
          const trade = await tradeRes.json();
          addTrackedTrade(trade);
        }

        const portfolioRes = await fetch("/api/portfolio", {
          headers: { "x-user-id": userId },
        });
        if (portfolioRes.ok) {
          const data = await portfolioRes.json();
          setHoldings(data.holdings ?? []);
        }

        pushNotification({
          type: "success",
          title: `Added ${signal.symbol} to holdings`,
          message: `${q} shares @ ${p}. We'll notify you at profit/loss thresholds.`,
          symbol: signal.symbol,
        });

        onSuccess();
        onClose();
        setQty("");
        setPrice("");
        setBuySource("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setSubmitting(false);
      }
    },
    [userId, qty, price, buySource, signal, addTrackedTrade, setHoldings, pushNotification, onSuccess, onClose]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl">
        <div className="border-b border-zinc-800 px-5 py-4">
          <h3 className="text-sm font-semibold text-zinc-100">Add to holdings</h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            {signal.companyName || signal.symbol} ({signal.symbol})
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-zinc-400">Number of shares</label>
            <input
              type="number"
              min={1}
              step={1}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              placeholder="e.g. 10"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-400">Price per share (₹)</label>
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              placeholder="e.g. 245.50"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-400">Where did you buy?</label>
            <select
              value={buySource}
              onChange={(e) => setBuySource(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              <option value="">Select platform</option>
              {buySources.map((src) => (
                <option key={src} value={src}>
                  {src}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {submitting ? "Adding…" : "Add holding"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
