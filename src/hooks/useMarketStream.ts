"use client";

import { useEffect, useRef } from "react";
import { useTradingStore } from "@/store/trading.store";
import type { MarketTick, TradeSignal, AgentState, SellAlert } from "@/types";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3001";
const MAX_RECONNECT_DELAY = 30_000;
const BASE_DELAY = 1_000;

function showBrowserNotification(alert: SellAlert) {
  if (typeof window === "undefined") return;
  if (Notification.permission !== "granted") return;

  new Notification(`Sell Alert: ${alert.symbol}`, {
    body: `${alert.companyName} — ${alert.reason}\nConfidence: ${alert.confidence}%`,
    icon: "/favicon.ico",
    tag: `sell-${alert.symbol}`,
  });
}

export function useMarketStream() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);

  const pushToBuffer = useTradingStore((s) => s.pushToBuffer);
  const addSignal = useTradingStore((s) => s.addSignal);
  const setSignals = useTradingStore((s) => s.setSignals);
  const setAgentState = useTradingStore((s) => s.setAgentState);
  const appendAgentLog = useTradingStore((s) => s.appendAgentLog);
  const setWsSend = useTradingStore((s) => s.setWsSend);
  const addSellAlert = useTradingStore((s) => s.addSellAlert);
  const pushNotification = useTradingStore((s) => s.pushNotification);
  const replaceNotificationId = useTradingStore((s) => s.replaceNotificationId);
  const userId = useTradingStore((s) => s.userId);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      if (disposed) return;

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttempt.current = 0;
        setWsSend((data: string) => ws.send(data));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as {
            type: string;
            data: unknown;
          };

          switch (msg.type) {
            case "tick":
              pushToBuffer(msg.data as MarketTick);
              break;
            case "signal": {
              const sig = msg.data as TradeSignal;
              addSignal(sig);
              const sigTitle = `${sig.signal}: ${sig.symbol}`;
              const sigMessage =
                sig.headline ||
                `${sig.companyName} — Confidence ${sig.confidence}%`;
              pushNotification({
                type:
                  sig.signal === "BUY"
                    ? "success"
                    : sig.signal === "SELL"
                      ? "sell_alert"
                      : "info",
                title: sigTitle,
                message: sigMessage,
                symbol: sig.symbol,
              });
              fetch("/api/notify-discord", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  title: sigTitle,
                  message: sigMessage,
                  symbol: sig.symbol,
                  sourceName: sig.sourceName,
                  sourceUrl: sig.sourceUrl,
                  headline: sig.headline,
                  companyName: sig.companyName,
                  confidence: sig.confidence,
                  signal: sig.signal,
                  profitPossibilityScore: sig.profitPossibilityScore,
                }),
              }).catch(() => {});
              break;
            }
            case "signalBatch":
              setSignals(msg.data as TradeSignal[]);
              break;
            case "agentState":
              setAgentState(msg.data as AgentState);
              break;
            case "agentLog": {
              const payload = msg.data as { line?: string };
              if (typeof payload?.line === "string")
                appendAgentLog(payload.line);
              break;
            }
            case "sellAlert": {
              const alert = msg.data as SellAlert;
              addSellAlert(alert);
              showBrowserNotification(alert);
              const notifPayload = {
                type: "sell_alert" as const,
                title: `SELL ALERT: ${alert.symbol}`,
                message: `${alert.companyName} — ${alert.reason}`,
                symbol: alert.symbol,
                priority: "high" as const,
              };
              const localId = pushNotification(notifPayload);
              if (userId) {
                fetch("/api/notifications", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ userId, ...notifPayload }),
                })
                  .then((res) => (res.ok ? res.json() : null))
                  .then((data) => {
                    if (data?.id) replaceNotificationId(localId, data.id);
                  })
                  .catch(() => {});
              }
              fetch("/api/notify-discord", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  title: notifPayload.title,
                  message: notifPayload.message,
                  symbol: alert.symbol,
                  companyName: alert.companyName,
                  confidence: alert.confidence,
                }),
              }).catch(() => {});
              break;
            }
          }
        } catch {
          // Malformed message
        }
      };

      ws.onclose = () => {
        if (disposed) return;
        const delay = Math.min(
          BASE_DELAY * 2 ** reconnectAttempt.current,
          MAX_RECONNECT_DELAY,
        );
        reconnectAttempt.current++;
        reconnectTimer = setTimeout(connect, delay);
      };

      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      disposed = true;
      clearTimeout(reconnectTimer);
      setWsSend(null);
      wsRef.current?.close();
    };
  }, [
    pushToBuffer,
    addSignal,
    setSignals,
    setAgentState,
    appendAgentLog,
    setWsSend,
    addSellAlert,
    pushNotification,
    replaceNotificationId,
    userId,
  ]);
}
