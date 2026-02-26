"use client";

import { useState, useEffect, useCallback } from "react";
import type { AppConfigValue } from "@/types";

export interface AppConfigMap {
  config: Record<string, AppConfigValue>;
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useAppConfig(): AppConfigMap {
  const [config, setConfig] = useState<Record<string, AppConfigValue>>({});
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/config");
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config ?? {});
      }
    } catch {
      setConfig({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { config, loading, refetch };
}

export function parseBuySources(config: Record<string, AppConfigValue>): string[] {
  try {
    const raw = config.buySources;
    if (typeof raw !== "string") return [];
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export interface BrokerLink {
  name: string;
  url: (symbol: string) => string;
}

export function parseBrokerLinks(config: Record<string, AppConfigValue>): BrokerLink[] {
  try {
    const raw = config.brokerLinks;
    if (typeof raw !== "string") return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x): x is { name?: string; urlTemplate?: string } => x != null && typeof x === "object")
      .map((x) => ({
        name: String(x.name ?? ""),
        url: (symbol: string) =>
          String(x.urlTemplate ?? "")
            .replace(/\{\{symbol\}\}/g, encodeURIComponent(symbol)),
      }))
      .filter((b) => b.name);
  } catch {
    return [];
  }
}
