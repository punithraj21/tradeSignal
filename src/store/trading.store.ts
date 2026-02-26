"use client";

import { create } from "zustand";
import type {
  MarketTick,
  TradeSignal,
  AgentState,
  Holding,
  Position,
  TrackedTrade,
  SellAlert,
} from "@/types";
import type { NotificationPriority } from "@/types";

export interface AppNotification {
  id: string;
  type: "sell_alert" | "info" | "success" | "error";
  title: string;
  message: string;
  symbol?: string;
  priority?: NotificationPriority;
  readAt: number | null;
  createdAt: number;
}

interface TradingState {
  userId: string | null;
  setUserId: (id: string | null) => void;

  marketData: Record<string, MarketTick>;
  _buffer: MarketTick[];
  pushToBuffer: (tick: MarketTick) => void;
  flushBuffer: () => void;

  signals: TradeSignal[];
  addSignal: (signal: TradeSignal) => void;
  setSignals: (signals: TradeSignal[]) => void;
  clearSignals: () => void;
  removeSignal: (idOrHeadline: string) => void;

  agentState: AgentState;
  setAgentState: (state: AgentState) => void;
  agentLogs: string[];
  appendAgentLog: (line: string) => void;
  clearAgentLogs: () => void;

  _wsSend: ((data: string) => void) | null;
  setWsSend: (fn: ((data: string) => void) | null) => void;
  sendCommand: (command: string) => void;

  trackedTrades: TrackedTrade[];
  setTrackedTrades: (trades: TrackedTrade[]) => void;
  addTrackedTrade: (trade: TrackedTrade) => void;

  sellAlerts: SellAlert[];
  addSellAlert: (alert: SellAlert) => void;
  clearSellAlerts: () => void;

  watchlistSymbols: string[];
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;
  setWatchlistSymbols: (symbols: string[]) => void;

  notifications: AppNotification[];
  setNotifications: (notifications: AppNotification[]) => void;
  pushNotification: (n: Omit<AppNotification, "id" | "createdAt" | "readAt"> & { id?: string; createdAt?: number; priority?: NotificationPriority }) => string;
  replaceNotificationId: (oldId: string, newId: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;

  holdings: Holding[];
  positions: Position[];
  setHoldings: (holdings: Holding[]) => void;
  setPositions: (positions: Position[]) => void;
}

export const useTradingStore = create<TradingState>((set, get) => ({
  userId: null,
  setUserId: (id) => set({ userId: id }),

  marketData: {},
  _buffer: [],

  pushToBuffer: (tick) =>
    set((state) => ({ _buffer: [...state._buffer, tick] })),

  flushBuffer: () => {
    const { _buffer } = get();
    if (_buffer.length === 0) return;
    set((state) => {
      const merged = { ...state.marketData };
      for (const tick of _buffer) merged[tick.symbol] = tick;
      return { marketData: merged, _buffer: [] };
    });
  },

  signals: [],
  addSignal: (signal) =>
    set((state) => ({
      signals: [signal, ...state.signals].slice(0, 100),
    })),
  setSignals: (signals) => set({ signals }),
  clearSignals: () => set({ signals: [] }),
  removeSignal: (idOrHeadline) =>
    set((state) => ({
      signals: state.signals.filter(
        (s) => s.id !== idOrHeadline && s.headline !== idOrHeadline
      ),
    })),

  agentState: { status: "idle", lastRun: null, signalsGenerated: 0 },
  setAgentState: (agentState) => set({ agentState }),
  agentLogs: [],
  appendAgentLog: (line) =>
    set((state) => ({
      agentLogs: [...state.agentLogs, line].slice(-300),
    })),
  clearAgentLogs: () => set({ agentLogs: [] }),

  _wsSend: null,
  setWsSend: (fn) => set({ _wsSend: fn }),
  sendCommand: (command) => {
    const send = get()._wsSend;
    if (send) send(JSON.stringify({ command }));
  },

  trackedTrades: [],
  setTrackedTrades: (trackedTrades) => set({ trackedTrades }),
  addTrackedTrade: (trade) =>
    set((state) => ({ trackedTrades: [trade, ...state.trackedTrades] })),

  sellAlerts: [],
  addSellAlert: (alert) =>
    set((state) => ({ sellAlerts: [alert, ...state.sellAlerts].slice(0, 20) })),
  clearSellAlerts: () => set({ sellAlerts: [] }),

  watchlistSymbols: [],
  addToWatchlist: (symbol) =>
    set((state) => ({
      watchlistSymbols: state.watchlistSymbols.includes(symbol)
        ? state.watchlistSymbols
        : [...state.watchlistSymbols, symbol],
    })),
  removeFromWatchlist: (symbol) =>
    set((state) => ({
      watchlistSymbols: state.watchlistSymbols.filter((s) => s !== symbol),
    })),
  setWatchlistSymbols: (symbols) => set({ watchlistSymbols: symbols }),

  notifications: [],
  setNotifications: (notifications) => set({ notifications }),

  pushNotification: (n) => {
    const priority = n.priority ?? (n.type === "sell_alert" ? "high" : "normal");
    const id = n.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const createdAt = n.createdAt ?? Date.now();
    const newN: AppNotification = { ...n, id, priority, readAt: null, createdAt };
    set((state) => ({
      notifications: [newN, ...state.notifications].slice(0, 100),
    }));
    return id;
  },
  replaceNotificationId: (oldId, newId) =>
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === oldId ? { ...n, id: newId } : n)),
    })),
  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, readAt: n.readAt ?? Date.now() } : n
      ),
    })),
  markAllNotificationsRead: () =>
    set((state) => {
      const now = Date.now();
      return {
        notifications: state.notifications.map((n) => ({ ...n, readAt: n.readAt ?? now })),
      };
    }),
  dismissNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
  clearNotifications: () => set({ notifications: [] }),

  holdings: [],
  positions: [],
  setHoldings: (holdings) => set({ holdings }),
  setPositions: (positions) => set({ positions }),
}));

if (typeof window !== "undefined") {
  setInterval(() => {
    useTradingStore.getState().flushBuffer();
  }, 500);
}
