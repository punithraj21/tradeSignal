"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { Holding } from "@/types";
import { useAppConfig, parseBuySources } from "@/hooks/use-app-config";

interface EditHoldingModalProps {
  isOpen: boolean;
  onClose: () => void;
  holding: Holding;
  userId: string | null;
  onSuccess: () => void;
}

export function EditHoldingModal({ isOpen, onClose, holding, userId, onSuccess }: EditHoldingModalProps) {
  const { config } = useAppConfig();
  const buySources = useMemo(() => parseBuySources(config), [config]);
  const [qty, setQty] = useState(String(holding.qty));
  const [avgBuyPrice, setAvgBuyPrice] = useState(String(holding.avgBuyPrice));
  const [buySource, setBuySource] = useState(holding.buySource ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQty(String(holding.qty));
      setAvgBuyPrice(String(holding.avgBuyPrice));
      setBuySource(holding.buySource ?? "");
      setError(null);
    }
  }, [isOpen, holding.qty, holding.avgBuyPrice, holding.buySource]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!userId || !holding.id) return;
      const q = parseInt(qty, 10);
      const p = parseFloat(avgBuyPrice);
      if (!Number.isInteger(q) || q < 0 || !Number.isFinite(p) || p <= 0) {
        setError("Enter valid quantity and avg price.");
        return;
      }
      setError(null);
      setSubmitting(true);
      try {
        const res = await fetch(`/api/holdings/${holding.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-user-id": userId },
          body: JSON.stringify({ qty: q, avgBuyPrice: p, buySource: buySource || undefined }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setError(err.error || "Update failed");
          return;
        }
        onSuccess();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setSubmitting(false);
      }
    },
    [userId, holding.id, qty, avgBuyPrice, buySource, onSuccess, onClose]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl">
        <div className="border-b border-zinc-800 px-5 py-4">
          <h3 className="text-sm font-semibold text-zinc-100">Edit holding</h3>
          <p className="mt-0.5 text-xs text-zinc-500">{holding.symbol}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label className="block text-[11px] font-medium text-zinc-400">Quantity</label>
            <input
              type="number"
              min={0}
              step={1}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-400">Avg cost (₹)</label>
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={avgBuyPrice}
              onChange={(e) => setAvgBuyPrice(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-400">Bought via</label>
            <select
              value={buySource}
              onChange={(e) => setBuySource(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100"
            >
              <option value="">Select</option>
              {buySources.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50">
              {submitting ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
