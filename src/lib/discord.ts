import type { AppConfigValue } from "@/types";
import { loadAppConfigFromDb } from "@/lib/get-app-config";

export interface DiscordNotificationPayload {
  title: string;
  message?: string;
  symbol?: string;
  /** Source name (e.g. ET Markets, LiveMint) */
  sourceName?: string;
  /** Source article URL */
  sourceUrl?: string;
  headline?: string;
  companyName?: string;
  confidence?: number;
  signal?: string;
  profitPossibilityScore?: number;
}

function parseBrokerLinksFromConfig(config: Record<string, AppConfigValue>): { name: string; urlTemplate: string }[] {
  try {
    const raw = config.brokerLinks;
    if (typeof raw !== "string") return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x): x is { name?: string; urlTemplate?: string } => x != null && typeof x === "object")
      .map((x) => ({ name: String(x.name ?? ""), urlTemplate: String(x.urlTemplate ?? "") }))
      .filter((b) => b.name && b.urlTemplate);
  } catch {
    return [];
  }
}

/**
 * Build Discord message content with title, message, source, and broker trade links.
 */
function buildDiscordContent(
  payload: DiscordNotificationPayload,
  config: Record<string, AppConfigValue>
): string {
  const lines: string[] = [];
  lines.push(`**${payload.title}**`);
  if (payload.message) lines.push(payload.message);
  if (payload.headline) lines.push(`_${payload.headline}_`);
  if (payload.companyName != null && payload.symbol) {
    lines.push(`**Symbol:** ${payload.symbol} · ${payload.companyName}`);
  } else if (payload.symbol) {
    lines.push(`**Symbol:** ${payload.symbol}`);
  }
  if (payload.confidence != null) lines.push(`**Confidence:** ${payload.confidence}%`);
  if (payload.profitPossibilityScore != null) lines.push(`**PPS:** ${payload.profitPossibilityScore}`);
  if (payload.signal) lines.push(`**Signal:** ${payload.signal}`);

  if (payload.sourceName || payload.sourceUrl) {
    const sourceText = payload.sourceUrl
      ? `[${payload.sourceName || "Source"}](${payload.sourceUrl})`
      : (payload.sourceName || "Source");
    lines.push(`**Source:** ${sourceText}`);
  }

  if (payload.symbol) {
    const brokers = parseBrokerLinksFromConfig(config);
    if (brokers.length > 0) {
      const tradeLinks = brokers
        .map((b) => {
          const url = b.urlTemplate.replace(/\{\{symbol\}\}/g, encodeURIComponent(payload.symbol!));
          return `[${b.name}](${url})`;
        })
        .join(" · ");
      lines.push(`**Trade:** ${tradeLinks}`);
    }
  }

  return lines.join("\n");
}

/**
 * Send a notification to the Discord webhook URL from app config.
 * Includes source and broker links from config when symbol/source details are provided.
 * No-op if discordWebhookUrl is not set in config.
 */
export async function sendDiscordNotification(
  payload: DiscordNotificationPayload
): Promise<boolean> {
  const config = await loadAppConfigFromDb();
  const webhookUrl = String(config.discordWebhookUrl ?? "").trim();
  if (!webhookUrl) return false;

  const content = buildDiscordContent(payload, config);
  const body: { content: string } = { content };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch (err) {
    console.error("[discord] Webhook send failed:", err);
    return false;
  }
}
