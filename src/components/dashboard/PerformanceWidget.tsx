"use client";

import { useTradingStore } from "@/store/trading.store";

interface RiskMetrics {
  sharpeRatio: number;
  maxDrawdown: number;
  profitFactor: number;
  winRate: number;
  totalTrades: number;
}

function computeRiskMetrics(
  signals: { signal: string; profitPossibilityScore: number }[]
): RiskMetrics {
  if (signals.length === 0) {
    return {
      sharpeRatio: 0,
      maxDrawdown: 0,
      profitFactor: 0,
      winRate: 0,
      totalTrades: 0,
    };
  }

  const scores = signals.map((s) => s.profitPossibilityScore);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance =
    scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / scores.length;
  const stddev = Math.sqrt(variance);

  const riskFreeRate = 6.5;
  const sharpeRatio = stddev > 0 ? (mean - riskFreeRate) / stddev : 0;

  let peak = 0;
  let maxDrawdown = 0;
  let cumulative = 0;
  for (const score of scores) {
    cumulative += score - 50;
    if (cumulative > peak) peak = cumulative;
    const drawdown = peak - cumulative;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  const wins = signals.filter(
    (s) => s.signal === "BUY" && s.profitPossibilityScore > 50
  ).length;
  const losses = signals.filter(
    (s) => s.signal === "BUY" && s.profitPossibilityScore <= 50
  ).length;
  const profitFactor = losses > 0 ? wins / losses : wins;
  const actionable = signals.filter((s) => s.signal !== "HOLD").length;
  const winRate = actionable > 0 ? (wins / actionable) * 100 : 0;

  return {
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    profitFactor: Math.round(profitFactor * 100) / 100,
    winRate: Math.round(winRate * 100) / 100,
    totalTrades: actionable,
  };
}

export function PerformanceWidget() {
  const signals = useTradingStore((s) => s.signals);
  const metrics = computeRiskMetrics(signals);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
      <div className="border-b border-zinc-800 px-5 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
          Performance
        </h2>
      </div>

      <div className="space-y-px bg-zinc-800">
        <MetricRow
          label="Sharpe Ratio"
          value={metrics.sharpeRatio.toFixed(2)}
          description="Risk-adjusted return (RF = 6.5% IN T-bill)"
          color={
            metrics.sharpeRatio > 1
              ? "emerald"
              : metrics.sharpeRatio > 0
                ? "amber"
                : "red"
          }
        />
        <MetricRow
          label="Max Drawdown"
          value={`${metrics.maxDrawdown.toFixed(1)} pts`}
          description="Largest peak-to-trough decline"
          color={metrics.maxDrawdown < 20 ? "emerald" : "red"}
        />
        <MetricRow
          label="Profit Factor"
          value={metrics.profitFactor.toFixed(2)}
          description="Gross wins / Gross losses"
          color={
            metrics.profitFactor > 1.5
              ? "emerald"
              : metrics.profitFactor > 1
                ? "amber"
                : "red"
          }
        />
        <MetricRow
          label="Win Rate"
          value={`${metrics.winRate.toFixed(1)}%`}
          description="Profitable signals / Total signals"
          color={
            metrics.winRate > 60
              ? "emerald"
              : metrics.winRate > 40
                ? "amber"
                : "red"
          }
        />
        <MetricRow
          label="Total Trades"
          value={metrics.totalTrades.toString()}
          description="Actionable signals (BUY + SELL)"
        />
      </div>

      {signals.length === 0 && (
        <div className="px-5 py-4 text-center text-xs text-zinc-600">
          Metrics will populate as signals arrive
        </div>
      )}
    </div>
  );
}

function MetricRow({
  label,
  value,
  description,
  color,
}: {
  label: string;
  value: string;
  description: string;
  color?: "emerald" | "amber" | "red";
}) {
  const valueColor =
    color === "emerald"
      ? "text-emerald-400"
      : color === "amber"
        ? "text-amber-400"
        : color === "red"
          ? "text-red-400"
          : "text-zinc-100";

  return (
    <div className="flex items-center justify-between bg-zinc-900/50 px-5 py-4">
      <div>
        <div className="text-sm font-medium text-zinc-200">{label}</div>
        <div className="text-[10px] text-zinc-600">{description}</div>
      </div>
      <div className={`text-lg font-bold tabular-nums ${valueColor}`}>
        {value}
      </div>
    </div>
  );
}
