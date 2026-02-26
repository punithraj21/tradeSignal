"use client";

import { useCallback } from "react";
import { useTradingStore } from "@/store/trading.store";

export function Watchlist() {
  const watchlistSymbols = useTradingStore((s) => s.watchlistSymbols);
  const setWatchlistSymbols = useTradingStore((s) => s.setWatchlistSymbols);
  const removeFromWatchlist = useTradingStore((s) => s.removeFromWatchlist);
  const userId = useTradingStore((s) => s.userId);
  const signals = useTradingStore((s) => s.signals);

  const syncRemove = useCallback(
    async (symbol: string) => {
      const next = watchlistSymbols.filter((s) => s !== symbol);
      if (!userId) {
        setWatchlistSymbols(next);
        return;
      }
      try {
        const res = await fetch("/api/watchlist", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, symbols: next }),
        });
        if (res.ok) setWatchlistSymbols(next);
      } catch { /* keep current */ }
    },
    [userId, watchlistSymbols, setWatchlistSymbols]
  );

  const watchedSignals = watchlistSymbols
    .map((sym) => signals.find((s) => s.symbol === sym))
    .filter(Boolean);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
      <div className="border-b border-zinc-800 px-5 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
          Watchlist
        </h2>
        <p className="mt-0.5 text-[11px] text-zinc-600">
          {watchlistSymbols.length} symbols tracked
        </p>
      </div>

      {watchlistSymbols.length === 0 ? (
        <div className="flex h-36 flex-col items-center justify-center gap-1 text-sm text-zinc-600">
          <svg className="h-6 w-6 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-xs">Add stocks from signals below</span>
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/50">
          {watchedSignals.map((signal) =>
            signal ? (
              <div
                key={signal.symbol}
                className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-zinc-800/30"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-200">{signal.symbol}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                        signal.signal === "BUY"
                          ? "bg-emerald-950/60 text-emerald-400"
                          : signal.signal === "SELL"
                            ? "bg-red-950/60 text-red-400"
                            : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {signal.signal}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                    {signal.companyName}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs font-bold tabular-nums text-zinc-200">
                      {signal.confidence}%
                    </div>
                    <div className="text-[10px] text-zinc-600">Conf.</div>
                  </div>
                  <button
                    onClick={() => syncRemove(signal.symbol)}
                    className="rounded-md p-1 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-red-400"
                    title="Remove from watchlist"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : null
          )}
          {/* Show symbols without matching signals */}
          {watchlistSymbols
            .filter((sym) => !signals.some((s) => s.symbol === sym))
            .map((sym) => (
              <div
                key={sym}
                className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-zinc-800/30"
              >
                <span className="text-sm font-medium text-zinc-400">{sym}</span>
                <button
                  onClick={() => syncRemove(sym)}
                  className="rounded-md p-1 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-red-400"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
