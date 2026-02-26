"use client";

import { useState, useCallback } from "react";
import type { Holding } from "@/types";

interface SellHoldingModalProps {
  isOpen: boolean;
  onClose: () => void;
  holding: Holding;
  userId: string | null;
  onSuccess: () => void;
}

export function SellHoldingModal({ isOpen, onClose, holding, userId, onSuccess }: SellHoldingModalProps) {
  const [qtyToSell, setQtyToSell] = useState(String(holding.qty));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxQty = holding.qty ?? 0;
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!userId || !holding.id) return;
      const q = parseInt(qtyToSell, 10);
      if (!Number.isInteger(q) || q <= 0 || q > maxQty) {
        setError(`Enter quantity between 1 and ${maxQty}`);
        return;
      }
      setError(null);
      setSubmitting(true);
      try {
        if (q >= maxQty) {
          const res = await fetch(`/api/holdings/${holding.id}`, {
            method: "DELETE",
            headers: { "x-user-id": userId },
          });
          if (!res.ok) {
            setError("Failed to remove holding");
            return;
          }
        } else {
          const res = await fetch(`/api/holdings/${holding.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", "x-user-id": userId },
            body: JSON.stringify({ qty: maxQty - q }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            setError(err.error || "Failed to update holding");
            return;
          }
        }
        onSuccess();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setSubmitting(false);
      }
    },
    [userId, holding.id, maxQty, qtyToSell, onSuccess, onClose]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl">
        <div className="border-b border-zinc-800 px-5 py-4">
          <h3 className="text-sm font-semibold text-zinc-100">Sell holding</h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            {holding.symbol} — you hold {maxQty} shares
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label className="block text-[11px] font-medium text-zinc-400">Quantity to sell</label>
            <input
              type="number"
              min={1}
              max={maxQty}
              step={1}
              value={qtyToSell}
              onChange={(e) => setQtyToSell(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100"
              required
            />
            <p className="mt-1 text-[10px] text-zinc-500">
              Sell all ({maxQty}) to remove this holding
            </p>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50">
              {submitting ? "Selling…" : "Sell"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
