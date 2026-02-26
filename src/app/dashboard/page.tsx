"use client";

import { useEffect } from "react";
import { Watchlist } from "@/components/dashboard/Watchlist";
import { PortfolioOverview } from "@/components/dashboard/PortfolioOverview";
import { XAIFeed } from "@/components/dashboard/XAIFeed";
import { PerformanceWidget } from "@/components/dashboard/PerformanceWidget";
import { HoldingsTable } from "@/components/dashboard/HoldingsTable";
import { useTradingStore } from "@/store/trading.store";

function toAppNotification(r: {
  id: string;
  type: string;
  title: string;
  message: string;
  symbol?: string;
  priority?: string;
  readAt: string | null;
  createdAt: string;
}) {
  return {
    id: r.id,
    type: r.type as "sell_alert" | "info" | "success" | "error",
    title: r.title,
    message: r.message,
    symbol: r.symbol,
    priority: (r.priority as "high" | "normal" | "low") ?? "normal",
    readAt: r.readAt ? new Date(r.readAt).getTime() : null,
    createdAt: new Date(r.createdAt).getTime(),
  };
}

export default function DashboardPage() {
  const setSignals = useTradingStore((s) => s.setSignals);
  const setTrackedTrades = useTradingStore((s) => s.setTrackedTrades);
  const setWatchlistSymbols = useTradingStore((s) => s.setWatchlistSymbols);
  const setNotifications = useTradingStore((s) => s.setNotifications);
  const userId = useTradingStore((s) => s.userId);

  useEffect(() => {
    let cancelled = false;

    async function loadSignals() {
      try {
        const res = await fetch("/api/signals?limit=50");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (data.signals?.length && !cancelled) setSignals(data.signals);
      } catch { /* WS will populate */ }
    }

    loadSignals();
    return () => { cancelled = true; };
  }, [setSignals]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function loadTrackedTrades() {
      try {
        const res = await fetch(`/api/tracked-trades?userId=${userId}`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (data.trades?.length && !cancelled) setTrackedTrades(data.trades);
      } catch { /* ignore */ }
    }

    loadTrackedTrades();
    return () => { cancelled = true; };
  }, [userId, setTrackedTrades]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function loadWatchlist() {
      try {
        const res = await fetch(`/api/watchlist?userId=${userId}`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.symbols)) setWatchlistSymbols(data.symbols);
      } catch { /* ignore */ }
    }

    loadWatchlist();
    return () => { cancelled = true; };
  }, [userId, setWatchlistSymbols]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function loadNotifications() {
      try {
        const res = await fetch(`/api/notifications?userId=${userId}&limit=50`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled && data.notifications?.length) {
          setNotifications(data.notifications.map(toAppNotification));
        }
      } catch { /* ignore */ }
    }

    loadNotifications();
    return () => { cancelled = true; };
  }, [userId, setNotifications]);

  return (
    <div className="space-y-6">
      <XAIFeed />

      <HoldingsTable />

      <div className="grid gap-6 lg:grid-cols-3">
        <Watchlist />
        <PortfolioOverview />
        <PerformanceWidget />
      </div>
    </div>
  );
}
