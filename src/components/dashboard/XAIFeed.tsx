"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useTradingStore } from "@/store/trading.store";
import type { TradeSignal } from "@/types";
import { BuyModal } from "@/components/dashboard/BuyModal";
import { useAppConfig, parseBrokerLinks, type BrokerLink } from "@/hooks/use-app-config";

function formatINR(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(n);
}

function formatTime(raw: unknown): string {
  if (!raw) return "";
  if (raw instanceof Date) return raw.toLocaleString();
  if (typeof raw === "string") return new Date(raw).toLocaleString();
  if (typeof raw === "object" && raw !== null && "_seconds" in raw) {
    return new Date((raw as { _seconds: number })._seconds * 1000).toLocaleString();
  }
  return "";
}

function deduplicateSignals(signals: TradeSignal[]): TradeSignal[] {
  const seen = new Map<string, TradeSignal>();
  for (const signal of signals) {
    if (!seen.has(signal.headline)) {
      seen.set(signal.headline, signal);
    }
  }
  return Array.from(seen.values());
}

export function XAIFeed() {
  const { config } = useAppConfig();
  const brokerLinks = useMemo(() => parseBrokerLinks(config), [config]);
  const rawSignals = useTradingStore((s) => s.signals);
  const clearSignals = useTradingStore((s) => s.clearSignals);
  const sendCommand = useTradingStore((s) => s.sendCommand);
  const agentState = useTradingStore((s) => s.agentState);
  const agentLogs = useTradingStore((s) => s.agentLogs);
  const clearAgentLogs = useTradingStore((s) => s.clearAgentLogs);
  const sellAlerts = useTradingStore((s) => s.sellAlerts);
  const clearSellAlerts = useTradingStore((s) => s.clearSellAlerts);

  const signals = useMemo(() => deduplicateSignals(rawSignals), [rawSignals]);

  const [clearing, setClearing] = useState(false);
  const [agentLogModalOpen, setAgentLogModalOpen] = useState(false);
  const isAgentBusy = agentState.status !== "idle";

  const handleClear = useCallback(async () => {
    setClearing(true);
    try {
      clearSignals();
      sendCommand("clearSignals");
      await fetch("/api/signals", { method: "DELETE" });
    } finally {
      setClearing(false);
    }
  }, [clearSignals, sendCommand]);

  const handleRefetch = useCallback(() => {
    sendCommand("refetch");
  }, [sendCommand]);

  const buyCount = signals.filter((s) => s.signal === "BUY").length;
  const sellCount = signals.filter((s) => s.signal === "SELL").length;
  const holdCount = signals.filter((s) => s.signal === "HOLD").length;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-zinc-100">
              AI Trade Intelligence
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Autonomous analysis &middot; unique signals only
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={handleRefetch}
              disabled={isAgentBusy}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-xs font-medium text-zinc-300 transition-all hover:border-zinc-600 hover:bg-zinc-700 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg className={`h-3.5 w-3.5 ${isAgentBusy ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isAgentBusy ? "Running…" : "Refetch"}
            </button>
            <button
              onClick={handleClear}
              disabled={clearing || signals.length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-xs font-medium text-red-400 transition-all hover:border-red-800 hover:bg-red-900/30 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {clearing ? "Clearing…" : "Clear All"}
            </button>
          </div>
        </div>

        {/* Status strip — click to open background log */}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-zinc-800/80 bg-zinc-950/50 px-4 py-2.5">
          <button
            type="button"
            onClick={() => setAgentLogModalOpen(true)}
            className="flex items-center gap-2 rounded-md py-0.5 pr-1 transition-colors hover:bg-zinc-800/80 focus:outline-none focus:ring-1 focus:ring-zinc-600"
            title="View what’s happening in the background"
          >
            <div className={`h-2 w-2 rounded-full ${agentState.status === "idle" ? "bg-zinc-500" : "animate-pulse bg-blue-500"}`} />
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">{agentState.status}</span>
          </button>
          <span className="text-[11px] tabular-nums text-zinc-500">
            <strong className="text-zinc-300">{signals.length}</strong> unique signals
          </span>
          {signals.length > 0 && (
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-emerald-400">{buyCount} Buy</span>
              <span className="text-red-400">{sellCount} Sell</span>
              <span className="text-zinc-400">{holdCount} Hold</span>
            </div>
          )}
          {agentState.lastRun && (
            <span className="text-[11px] text-zinc-600">
              Last run {new Date(agentState.lastRun).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Sell alerts banner */}
      {sellAlerts.length > 0 && (
        <div className="border-b border-red-900/40 bg-red-950/30 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="text-xs font-semibold text-red-300">
                Sell Alerts ({sellAlerts.length})
              </span>
            </div>
            <button onClick={clearSellAlerts} className="text-[10px] text-red-400/60 hover:text-red-300">Dismiss</button>
          </div>
          <div className="mt-2 space-y-1.5">
            {sellAlerts.map((alert, i) => (
              <div key={`${alert.symbol}-${i}`} className="rounded-md bg-red-950/40 px-3 py-2 text-xs text-red-200">
                <strong>{alert.symbol}</strong> ({alert.companyName}) — {alert.reason}
                <span className="ml-2 text-red-400/60">{formatTime(alert.triggeredAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {signals.length === 0 ? (
        <div className="flex h-56 flex-col items-center justify-center gap-3 text-sm text-zinc-600">
          <svg className="h-10 w-10 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span>No signals yet</span>
          <button
            onClick={handleRefetch}
            disabled={isAgentBusy}
            className="rounded-lg bg-zinc-800 px-5 py-2 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isAgentBusy ? "Agent running…" : "Run agent now"}
          </button>
        </div>
      ) : (
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          {signals.map((signal) => (
            <SignalCard key={signal.id ?? `${signal.symbol}-${signal.headline}`} signal={signal} brokerLinks={brokerLinks} />
          ))}
        </div>
      )}

      {/* Agent background log modal */}
      {agentLogModalOpen && (
        <AgentLogModal
          onClose={() => setAgentLogModalOpen(false)}
          status={agentState.status}
          logs={agentLogs}
          onClearLogs={clearAgentLogs}
        />
      )}
    </div>
  );
}

// -- Agent log modal (what's happening in the background) ---------------------

function AgentLogModal({
  onClose,
  status,
  logs,
  onClearLogs,
}: {
  onClose: () => void;
  status: string;
  logs: string[];
  onClearLogs: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [logs]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Background activity</h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              Scraper & AI agent — click status in the header to open this
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-medium uppercase ${
                status === "idle" ? "bg-zinc-700 text-zinc-400" : "bg-blue-500/20 text-blue-300"
              }`}
            >
              {status === "idle" ? "Idle" : status}
            </span>
            <button
              type="button"
              onClick={onClearLogs}
              className="rounded border border-zinc-700 px-2 py-1 text-[10px] text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
            >
              Clear log
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div
          ref={scrollRef}
          className="min-h-[200px] flex-1 overflow-y-auto overflow-x-auto px-5 py-4 font-mono text-[11px] leading-relaxed text-zinc-400"
        >
          {logs.length === 0 ? (
            <p className="text-zinc-600">No log lines yet. Run a refetch to see activity.</p>
          ) : (
            <pre className="whitespace-pre-wrap break-all">{logs.join("\n")}</pre>
          )}
        </div>
      </div>
    </div>
  );
}

// -- Signal Card ---------------------------------------------------------------

function SignalCard({ signal, brokerLinks }: { signal: TradeSignal; brokerLinks: BrokerLink[] }) {
  const [expanded, setExpanded] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [tracked, setTracked] = useState(false);
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const removeSignal = useTradingStore((s) => s.removeSignal);
  const userId = useTradingStore((s) => s.userId);
  const trackedTrades = useTradingStore((s) => s.trackedTrades);
  const watchlistSymbols = useTradingStore((s) => s.watchlistSymbols);
  const setWatchlistSymbols = useTradingStore((s) => s.setWatchlistSymbols);
  const addToWatchlist = useTradingStore((s) => s.addToWatchlist);
  const removeFromWatchlist = useTradingStore((s) => s.removeFromWatchlist);
  const holdings = useTradingStore((s) => s.holdings);

  const holdingForSymbol = holdings.find((h) => h.symbol === signal.symbol);
  const isWatched = watchlistSymbols.includes(signal.symbol);
  const isAlreadyTracked =
    tracked || trackedTrades.some((t) => t.symbol === signal.symbol && t.status === "watching");

  const isBuy = signal.signal === "BUY";
  const isSell = signal.signal === "SELL";

  const accentBorder = isBuy
    ? "border-l-emerald-500"
    : isSell
      ? "border-l-red-500"
      : "border-l-zinc-700";

  const badgeClass = isBuy
    ? "text-emerald-400 bg-emerald-950/60 border-emerald-800/40"
    : isSell
      ? "text-red-400 bg-red-950/60 border-red-800/40"
      : "text-zinc-400 bg-zinc-800/60 border-zinc-700/40";

  const confidenceColor =
    signal.confidence >= 70 ? "bg-emerald-500" : signal.confidence >= 50 ? "bg-yellow-500" : "bg-red-500";

  const handleDelete = useCallback(async () => {
    const key = signal.id || signal.headline;
    removeSignal(key);
    if (signal.id) {
      fetch(`/api/signals/${signal.id}`, { method: "DELETE" }).catch(() => {});
    }
  }, [signal.id, signal.headline, removeSignal]);

  const openBuyModal = useCallback(() => {
    if (!userId || isAlreadyTracked) return;
    setBuyModalOpen(true);
  }, [userId, isAlreadyTracked]);

  const handleBuySuccess = useCallback(() => {
    setTracked(true);
  }, []);

  const toggleWatchlist = useCallback(async () => {
    const next = isWatched
      ? watchlistSymbols.filter((s) => s !== signal.symbol)
      : [...watchlistSymbols, signal.symbol];
    if (!userId) {
      if (isWatched) removeFromWatchlist(signal.symbol);
      else addToWatchlist(signal.symbol);
      return;
    }
    try {
      const res = await fetch("/api/watchlist", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, symbols: next }),
      });
      if (res.ok) setWatchlistSymbols(next);
    } catch {
      if (isWatched) removeFromWatchlist(signal.symbol);
      else addToWatchlist(signal.symbol);
    }
  }, [signal.symbol, isWatched, userId, watchlistSymbols, addToWatchlist, removeFromWatchlist, setWatchlistSymbols]);

  const badgeLabel =
    isBuy && signal.id && isAlreadyTracked ? "HOLD" : signal.signal;
  const badgeIsClickable =
    isBuy && signal.id && !isAlreadyTracked && !!userId;
  const badgeClickHandler = isBuy && signal.id ? openBuyModal : undefined;

  const timeStr = formatTime(signal.createdAt);

  return (
    <div className={`rounded-xl border border-zinc-800 border-l-2 ${accentBorder} bg-zinc-900/80 p-5 transition-colors hover:bg-zinc-900`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-zinc-100">
              {signal.companyName || signal.symbol}
            </span>
            <span className="shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-500">
              {signal.symbol}
            </span>
          </div>
          {signal.headline && (
            <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 line-clamp-2">
              {signal.headline}
            </p>
          )}
          {holdingForSymbol && (
            <p className="mt-1.5 text-[11px] text-emerald-400/90">
              You hold {holdingForSymbol.qty} shares @ {formatINR(holdingForSymbol.avgBuyPrice)} · Total invested {formatINR((holdingForSymbol.qty ?? 0) * (holdingForSymbol.avgBuyPrice ?? 0))}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={toggleWatchlist}
            className={`rounded-md p-1 transition-colors ${
              isWatched
                ? "text-yellow-400 hover:text-yellow-300"
                : "text-zinc-600 hover:bg-zinc-800 hover:text-yellow-400"
            }`}
            title={isWatched ? "Remove from watchlist" : "Add to watchlist"}
          >
            <svg className="h-4 w-4" fill={isWatched ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </button>
          {badgeIsClickable ? (
            <button
              onClick={badgeClickHandler}
              className={`rounded-md border px-3 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors ${badgeClass} hover:opacity-90`}
              title="Add to holdings — enter quantity and price"
            >
              {badgeLabel}
            </button>
          ) : (
            <span className={`rounded-md border px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${badgeClass} ${isBuy && isAlreadyTracked ? "border-zinc-700/40 bg-zinc-800/60 text-zinc-400" : ""}`}>
              {badgeLabel}
            </span>
          )}
          <button
            onClick={handleDelete}
            className="rounded-md p-1 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-red-400"
            title="Remove signal"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Timestamp */}
      {timeStr && (
        <div className="mt-2 text-[10px] text-zinc-600">{timeStr}</div>
      )}

      {/* Confidence + PPS */}
      <div className="mt-3 flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-medium text-zinc-500">Confidence</span>
            <span className="font-bold tabular-nums text-zinc-300">{signal.confidence}%</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full rounded-full ${confidenceColor} transition-all`}
              style={{ width: `${signal.confidence}%` }}
            />
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-medium text-zinc-500">PPS</div>
          <div className="text-base font-bold tabular-nums text-zinc-200">
            {signal.profitPossibilityScore?.toFixed?.(1) ?? signal.profitPossibilityScore}
          </div>
        </div>
      </div>

      {/* Source */}
      {signal.sourceName && (
        <div className="mt-2.5 text-[11px] text-zinc-600">
          via{" "}
          {signal.sourceUrl ? (
            <a href={signal.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400/80 hover:text-blue-300 hover:underline">
              {signal.sourceName}
            </a>
          ) : signal.sourceName}
        </div>
      )}

      {/* Broker links */}
      <div className="mt-4 flex flex-wrap items-center gap-1">
        <span className="text-[9px] font-semibold uppercase tracking-widest text-zinc-600">Trade</span>
        {brokerLinks.map((broker) => (
          <a
            key={broker.name}
            href={broker.url(signal.symbol)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded border border-zinc-800 bg-zinc-800/40 px-2 py-0.5 text-[10px] font-medium text-zinc-500 transition-colors hover:border-zinc-600 hover:bg-zinc-700 hover:text-zinc-200"
          >
            {broker.name}
          </a>
        ))}
      </div>

      <BuyModal
        isOpen={buyModalOpen}
        onClose={() => setBuyModalOpen(false)}
        signal={signal}
        onSuccess={handleBuySuccess}
      />

      {/* Reasoning toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 flex items-center gap-1 text-[11px] font-medium text-zinc-500 transition-colors hover:text-zinc-300"
      >
        <svg className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        {expanded ? "Hide reasoning" : "Reasoning chain"}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          <ReasoningPanel
            title="Technical Analysis"
            content={signal.reasoning.technical}
            metrics={[
              { label: "RSI", value: signal.technicals.rsi.toFixed(1) },
              { label: "MACD", value: signal.technicals.macd > 0 ? "Bullish" : signal.technicals.macd < 0 ? "Bearish" : "Neutral" },
            ]}
            accent="blue"
          />
          <ReasoningPanel
            title="Fundamental Context"
            content={signal.reasoning.fundamental}
            accent="amber"
          />
          <ReasoningPanel
            title="Sentiment & Reputation"
            content={signal.reasoning.sentiment}
            metrics={[
              { label: "Leadership", value: `${signal.reputationScore.leadership}/100` },
              { label: "Conduct", value: `${signal.reputationScore.conduct}/100` },
              { label: "Financial", value: `${signal.reputationScore.financialPerformance}/100` },
            ]}
            accent="purple"
          />
        </div>
      )}
    </div>
  );
}

// -- Reasoning Panel -----------------------------------------------------------

function ReasoningPanel({
  title,
  content,
  metrics,
  accent,
}: {
  title: string;
  content: string;
  metrics?: { label: string; value: string }[];
  accent: "blue" | "amber" | "purple";
}) {
  const borderColors = {
    blue: "border-l-blue-500/70",
    amber: "border-l-amber-500/70",
    purple: "border-l-purple-500/70",
  };

  return (
    <div className={`rounded-r-lg border-l-2 ${borderColors[accent]} bg-zinc-800/20 px-4 py-3`}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{title}</div>
      <p className="mt-1 text-xs leading-relaxed text-zinc-400">{content}</p>
      {metrics && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {metrics.map((m) => (
            <div key={m.label} className="text-[11px]">
              <span className="text-zinc-600">{m.label}: </span>
              <span className="font-medium tabular-nums text-zinc-300">{m.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
