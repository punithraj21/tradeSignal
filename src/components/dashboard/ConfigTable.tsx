"use client";

import { useState, useEffect, useCallback } from "react";
import type { AppConfigKey, AppConfigValue } from "@/types";
import { CONFIG_SEED } from "@/types";

const LABELS: Record<AppConfigKey, string> = {
  scrapeIntervalMinutes: "Scrape interval (min)",
  holdingsCheckIntervalMinutes: "Holdings check interval (min)",
  profitThresholdPercent: "Profit threshold (%)",
  lossThresholdPercent: "Loss threshold (%)",
  thresholdCooldownHours: "Threshold notify cooldown (hours)",
  cacheTtlSeconds: "Config cache TTL (seconds)",
  defaultAiModelId: "Default AI model ID",
  aiProvider: "AI provider",
  aiModel: "AI model",
  signalsLimit: "Signals fetch limit",
  notificationsLimit: "Notifications cap (client)",
  maxCronHoldingsBatch: "Cron holdings batch size",
  pollinationsBaseUrl: "Pollinations API base URL",
  yahooChartBaseUrl: "Yahoo chart API base URL",
  buySources: "Buy sources (JSON array)",
  brokerLinks: "Broker links (JSON array)",
  maxNotificationsDeleteBatch: "Notifications delete batch size",
  discordWebhookUrl: "Discord webhook URL (notifications)",
};

export function ConfigTable() {
  const [config, setConfig] = useState<Record<string, AppConfigValue>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AppConfigKey | null>(null);
  const [draft, setDraft] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/config");
      if (res.ok) {
        const data = await res.json();
        setConfig({ ...CONFIG_SEED, ...data.config });
      }
    } catch {
      setConfig({ ...CONFIG_SEED });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = (key: AppConfigKey) => {
    setEditing(key);
    setDraft(String(config[key] ?? ""));
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraft("");
  };

  const save = async (key: AppConfigKey) => {
    const numericKeys: AppConfigKey[] = [
      "scrapeIntervalMinutes",
      "holdingsCheckIntervalMinutes",
      "profitThresholdPercent",
      "lossThresholdPercent",
      "thresholdCooldownHours",
      "cacheTtlSeconds",
      "signalsLimit",
      "notificationsLimit",
      "maxCronHoldingsBatch",
      "maxNotificationsDeleteBatch",
    ];
    const value: AppConfigValue =
      numericKeys.includes(key)
        ? (key === "profitThresholdPercent" || key === "lossThresholdPercent"
            ? parseFloat(draft)
            : parseInt(draft, 10))
        : draft;
    if (value === undefined || value === "") {
      cancelEdit();
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (res.ok) {
        setConfig((c) => ({ ...c, [key]: value }));
        setEditing(null);
        setDraft("");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-zinc-500">
        Loading config…
      </div>
    );
  }

  const keys = Object.keys(CONFIG_SEED) as AppConfigKey[];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
      <div className="border-b border-zinc-800 px-5 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
          App config
        </h2>
        <p className="mt-0.5 text-[11px] text-zinc-600">
          Stored in DB and cached. Scrape / holdings check use these values.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              <th className="px-5 py-3">Key</th>
              <th className="px-5 py-3">Value</th>
              <th className="w-24 px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => (
              <tr key={key} className="border-b border-zinc-800/50">
                <td className="px-5 py-3 font-medium text-zinc-300">
                  {LABELS[key] ?? key}
                </td>
                <td className="px-5 py-3">
                  {editing === key ? (
                    <input
                      type="text"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      className="w-full max-w-xs rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-100"
                    />
                  ) : (
                    <span className="text-zinc-400">
                      {String(config[key] ?? "")}
                    </span>
                  )}
                </td>
                <td className="px-2 py-3">
                  {editing === key ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => save(key)}
                        disabled={saving}
                        className="rounded px-2 py-0.5 text-[10px] font-medium text-emerald-400 hover:bg-emerald-950 disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="rounded px-2 py-0.5 text-[10px] font-medium text-zinc-500 hover:bg-zinc-800"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(key)}
                      className="rounded px-2 py-0.5 text-[10px] font-medium text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
