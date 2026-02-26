"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTradingStore, type AppNotification } from "@/store/trading.store";

export function NotificationBell() {
  const notifications = useTradingStore((s) => s.notifications);
  const userId = useTradingStore((s) => s.userId);
  const dismissNotification = useTradingStore((s) => s.dismissNotification);
  const clearNotifications = useTradingStore((s) => s.clearNotifications);
  const markNotificationRead = useTradingStore((s) => s.markNotificationRead);
  const markAllNotificationsRead = useTradingStore((s) => s.markAllNotificationsRead);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const handleMarkRead = useCallback(
    async (id: string) => {
      markNotificationRead(id);
      if (!userId) return;
      try {
        await fetch(`/api/notifications/${id}`, { method: "PATCH" });
      } catch { /* already updated locally */ }
    },
    [userId, markNotificationRead]
  );

  const handleMarkAllRead = useCallback(async () => {
    const unread = notifications.filter((n) => !n.readAt);
    markAllNotificationsRead();
    if (!userId) return;
    try {
      await Promise.all(unread.map((n) => fetch(`/api/notifications/${n.id}`, { method: "PATCH" })));
    } catch { /* already updated locally */ }
  }, [userId, notifications, markAllNotificationsRead]);

  const handleDismiss = useCallback(
    async (id: string) => {
      dismissNotification(id);
      if (!userId) return;
      try {
        await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      } catch { /* already removed locally */ }
    },
    [userId, dismissNotification]
  );

  const handleClearAll = useCallback(async () => {
    clearNotifications();
    if (!userId) return;
    try {
      await fetch(`/api/notifications?userId=${userId}`, { method: "DELETE" });
    } catch { /* already cleared locally */ }
  }, [userId, clearNotifications]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/50">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 px-4 py-3">
            <span className="text-xs font-semibold text-zinc-300">Notifications</span>
            {notifications.length > 0 && (
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={handleClearAll}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex h-24 items-center justify-center text-xs text-zinc-600">
                No notifications
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onMarkRead={() => handleMarkRead(n.id)}
                  onDismiss={() => handleDismiss(n.id)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationItem({
  notification: n,
  onMarkRead,
  onDismiss,
}: {
  notification: AppNotification;
  onMarkRead: () => void;
  onDismiss: () => void;
}) {
  const isRead = !!n.readAt;
  const priority = n.priority ?? "normal";

  const iconColor =
    n.type === "sell_alert"
      ? "text-red-400"
      : n.type === "success"
        ? "text-emerald-400"
        : n.type === "error"
          ? "text-amber-400"
          : "text-blue-400";

  const bgColor =
    n.type === "sell_alert"
      ? "bg-red-950/20"
      : n.type === "success"
        ? "bg-emerald-950/20"
        : "";

  const priorityLabel =
    priority === "high"
      ? "High"
      : priority === "low"
        ? "Low"
        : null;

  const age = Date.now() - n.createdAt;
  const timeLabel =
    age < 60_000
      ? "just now"
      : age < 3_600_000
        ? `${Math.floor(age / 60_000)}m ago`
        : `${Math.floor(age / 3_600_000)}h ago`;

  return (
    <div className={`flex items-start gap-3 border-b border-zinc-800/50 px-4 py-3 ${bgColor} transition-colors hover:bg-zinc-800/30 ${isRead ? "opacity-80" : ""}`}>
      <div className={`mt-0.5 shrink-0 ${iconColor}`}>
        {n.type === "sell_alert" ? (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        ) : n.type === "success" ? (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-zinc-200">{n.title}</span>
          {priorityLabel && (
            <span
              className={`rounded px-1 text-[9px] font-medium ${
                priority === "high"
                  ? "bg-red-500/20 text-red-400"
                  : "bg-zinc-700 text-zinc-500"
              }`}
            >
              {priorityLabel}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500 line-clamp-2">{n.message}</p>
        <span className="mt-1 text-[10px] text-zinc-600">{timeLabel}</span>
      </div>
      <div className="flex shrink-0 flex-col gap-0.5">
        {!isRead && (
          <button
            onClick={onMarkRead}
            className="rounded p-0.5 text-[10px] text-zinc-500 hover:text-zinc-300"
            title="Mark as read"
          >
            Read
          </button>
        )}
        <button
          onClick={onDismiss}
          className="rounded p-0.5 text-zinc-600 hover:text-zinc-300"
          title="Clear"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
