"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type StreamStatus = "idle" | "connecting" | "streaming" | "done" | "error";

interface AnalyzeHoldingModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  companyName: string;
}

export function AnalyzeHoldingModal({
  isOpen,
  onClose,
  symbol,
  companyName,
}: AnalyzeHoldingModalProps) {
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [streamedText, setStreamedText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  const streamAccRef = useRef("");
  const flushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const FLUSH_MS = 120;

  const flushStream = useCallback(() => {
    flushTimeoutRef.current = null;
    if (isMountedRef.current) setStreamedText(streamAccRef.current);
  }, []);

  const scheduleFlush = useCallback(() => {
    if (flushTimeoutRef.current != null) return;
    flushTimeoutRef.current = setTimeout(flushStream, FLUSH_MS);
  }, [flushStream]);

  const scrollToStream = () => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const runAnalysis = useCallback(
    (forceReanalyze: boolean) => {
      if (!symbol) return;
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
        flushTimeoutRef.current = null;
      }
      setStreamedText("");
      setError(null);
      setStatus("connecting");

      (async () => {
        try {
          const res = await fetch("/api/analyze-holding", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              symbol,
              companyName: companyName || symbol,
              forceReanalyze,
            }),
          });

          if (!isMountedRef.current) return;
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            setError(data.error || data.message || "Analysis failed");
            setStatus("error");
            return;
          }

          const reader = res.body?.getReader();
          if (!reader) {
            setError("No response body");
            setStatus("error");
            return;
          }

          setStatus("streaming");
          streamAccRef.current = "";
          const decoder = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (!isMountedRef.current) return;
            const chunk = decoder.decode(value, { stream: true });
            streamAccRef.current += chunk;
            if (isMountedRef.current) scheduleFlush();
          }
          if (flushTimeoutRef.current) {
            clearTimeout(flushTimeoutRef.current);
            flushTimeoutRef.current = null;
          }
          if (isMountedRef.current) {
            setStreamedText(streamAccRef.current);
            setStatus("done");
          }
        } catch (e) {
          if (isMountedRef.current) {
            setError("Request failed");
            setStatus("error");
          }
        }
      })();
    },
    [symbol, companyName, scheduleFlush]
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !symbol) return;
    runAnalysis(false);
  }, [isOpen, symbol, runAnalysis]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [streamedText]);

  if (!isOpen) return null;

  const statusLabel =
    status === "connecting"
      ? "Connecting…"
      : status === "streaming"
        ? "Streaming…"
        : status === "done"
          ? "Done"
          : status === "error"
            ? "Error"
            : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              AI market analysis
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              {companyName || symbol} ({symbol})
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => runAnalysis(true)}
              disabled={status === "connecting" || status === "streaming"}
              className="rounded border border-zinc-700 px-2.5 py-1.5 text-[11px] font-medium text-zinc-400 transition-colors hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
              title="Re-run analysis skipping cache"
            >
              Force reanalyze
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            </button>
          </div>
        </div>

        {/* Status bar — click to view what's happening in the background (same as AI Trade Intelligence) */}
        {(status === "connecting" ||
          status === "streaming" ||
          status === "done" ||
          status === "error") && (
          <button
            type="button"
            onClick={scrollToStream}
            className="flex w-full items-center gap-2 border-b border-zinc-800/50 px-5 py-2 text-left text-[11px] text-zinc-500 transition-colors hover:bg-zinc-800/50 focus:outline-none focus:ring-1 focus:ring-zinc-600"
            title="View what's happening in the background"
          >
            {(status === "connecting" || status === "streaming") && (
              <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            )}
            <span
              className={
                status === "error"
                  ? "text-red-400"
                  : status === "done"
                    ? "text-emerald-500"
                    : "text-zinc-400"
              }
            >
              {statusLabel}
            </span>
            <span className="ml-1 text-zinc-600">· Click to view stream</span>
          </button>
        )}

        <div className="border-b border-zinc-800/30 px-5 py-1.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
            What&apos;s happening
          </p>
        </div>
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overflow-x-auto px-5 py-4"
        >
          {error && <p className="text-sm text-red-400">{error}</p>}
          {streamedText ? (
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-zinc-300">
              {streamedText}
            </pre>
          ) : status === "connecting" && !error ? (
            <p className="text-xs text-zinc-500">Starting analysis…</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
