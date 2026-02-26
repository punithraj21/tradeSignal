import { request } from "undici";
import { adminDb } from "@/lib/firebase-admin";
import {
  extractCompanyFromHeadline,
  analyzeTradeSignal,
} from "./ai.service";
import type { TradeSignal, AgentState, SellAlert } from "@/types";

const RSS_FEEDS = [
  {
    name: "ET Markets",
    url: "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",
  },
  {
    name: "LiveMint Markets",
    url: "https://www.livemint.com/rss/markets",
  },
];

interface RSSItem {
  title: string;
  description: string;
  link: string;
  source: string;
}

type BroadcastFn = (type: string, data: unknown) => void;

async function fetchRSSFeed(
  feedUrl: string,
  sourceName: string
): Promise<RSSItem[]> {
  try {
    const { statusCode, body } = await request(feedUrl, {
      method: "GET",
      headers: { "user-agent": "Tijaara/1.0 RSS Reader" },
    });

    if (statusCode < 200 || statusCode >= 300) {
      console.warn(`[scraper] ${sourceName} returned ${statusCode}`);
      await body.dump();
      return [];
    }

    const xml = await body.text();
    const items: RSSItem[] = [];

    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const titleRegex = /<title><!\[CDATA\[(.*?)\]\]>|<title>(.*?)<\/title>/;
    const descRegex =
      /<description><!\[CDATA\[(.*?)\]\]>|<description>(.*?)<\/description>/;
    const linkRegex = /<link>(.*?)<\/link>/;

    let itemMatch: RegExpExecArray | null;
    while ((itemMatch = itemRegex.exec(xml)) !== null) {
      const block = itemMatch[1]!;
      const title =
        block.match(titleRegex)?.[1] ?? block.match(titleRegex)?.[2] ?? "";
      const description =
        block.match(descRegex)?.[1] ?? block.match(descRegex)?.[2] ?? "";
      const link = block.match(linkRegex)?.[1] ?? "";

      if (title) {
        items.push({ title, description, link, source: sourceName });
      }
    }

    return items;
  } catch (err) {
    console.error(`[scraper] Failed to fetch ${sourceName}:`, err);
    return [];
  }
}

async function isHeadlineAlreadyProcessed(headline: string): Promise<boolean> {
  const snapshot = await adminDb
    .collection("tradeSignals")
    .where("headline", "==", headline)
    .limit(1)
    .get();
  return !snapshot.empty;
}

async function checkTrackedTradesForSellAlerts(
  newSignals: TradeSignal[],
  broadcast?: BroadcastFn
) {
  const sellSymbols = newSignals
    .filter((s) => s.signal === "SELL")
    .map((s) => s.symbol);

  if (sellSymbols.length === 0) return;

  try {
    const snapshot = await adminDb
      .collection("trackedTrades")
      .where("status", "==", "watching")
      .where("symbol", "in", sellSymbols.slice(0, 10))
      .get();

    for (const doc of snapshot.docs) {
      const trade = doc.data();
      const matchingSignal = newSignals.find(
        (s) => s.symbol === trade.symbol && s.signal === "SELL"
      );

      if (!matchingSignal) continue;

      await doc.ref.update({
        status: "sell_triggered",
        sellTriggeredAt: new Date(),
        sellReason: matchingSignal.reasoning.fundamental,
      });

      const alert: SellAlert = {
        symbol: trade.symbol,
        companyName: trade.companyName,
        reason: matchingSignal.reasoning.fundamental,
        confidence: matchingSignal.confidence,
        triggeredAt: new Date(),
      };

      broadcast?.("sellAlert", alert);
      console.log(`[scraper] SELL ALERT: ${trade.symbol} — notifying watchers.`);
    }
  } catch (err) {
    console.error("[scraper] Error checking tracked trades:", err);
  }
}

export async function scraperAgent(broadcast?: BroadcastFn) {
  const agentState: AgentState = {
    status: "scraping",
    lastRun: new Date(),
    signalsGenerated: 0,
  };

  broadcast?.("agentState", agentState);
  broadcast?.("agentLog", { line: "[scraper] Starting RSS scrape cycle..." });
  console.log("[scraper] Starting RSS scrape cycle...");

  const allItems: RSSItem[] = [];
  const feedResults = await Promise.allSettled(
    RSS_FEEDS.map((f) => fetchRSSFeed(f.url, f.name))
  );
  for (const result of feedResults) {
    if (result.status === "fulfilled") allItems.push(...result.value);
  }

  broadcast?.("agentLog", { line: `[scraper] Fetched ${allItems.length} items across all feeds` });
  console.log(`[scraper] Fetched ${allItems.length} items across all feeds`);

  agentState.status = "analyzing";
  broadcast?.("agentState", agentState);
  broadcast?.("agentLog", { line: "[scraper] Analyzing headlines with AI..." });

  const processedSymbols = new Set<string>();
  const generatedSignals: TradeSignal[] = [];
  let skippedDuplicates = 0;

  for (const item of allItems.slice(0, 15)) {
    try {
      const alreadyExists = await isHeadlineAlreadyProcessed(item.title);
      if (alreadyExists) {
        skippedDuplicates++;
        continue;
      }

      const company = await extractCompanyFromHeadline(item.title);
      if (company.symbol === "MARKET" || processedSymbols.has(company.symbol))
        continue;
      processedSymbols.add(company.symbol);

      const logLine = `[scraper] AI agent analyzing ${company.symbol} (${company.companyName})...`;
      broadcast?.("agentLog", { line: logLine });
      console.log(logLine);

      const newsText = `${item.title}. ${item.description}`;
      const analysis = await analyzeTradeSignal(
        newsText,
        company.symbol,
        company.companyName
      );

      const signal: TradeSignal = {
        symbol: company.symbol,
        companyName: company.companyName,
        headline: item.title,
        sourceUrl: item.link,
        sourceName: item.source,
        signal: analysis.signal,
        confidence: analysis.confidence,
        reputationScore: {
          leadership: analysis.sentimentAnalysis.leadership,
          conduct: analysis.sentimentAnalysis.conduct,
          financialPerformance: analysis.sentimentAnalysis.financialPerformance,
          composite: analysis.sentimentAnalysis.composite,
        },
        technicals: {
          rsi: analysis.technicalAnalysis.rsiEstimate,
          macd: analysis.technicalAnalysis.macdSignal === "bullish" ? 1 : analysis.technicalAnalysis.macdSignal === "bearish" ? -1 : 0,
          macdSignal: 0,
          macdHistogram: analysis.technicalAnalysis.macdSignal === "bullish" ? 1 : analysis.technicalAnalysis.macdSignal === "bearish" ? -1 : 0,
        },
        reasoning: {
          technical: analysis.technicalAnalysis.summary,
          fundamental: analysis.fundamentalAnalysis,
          sentiment: analysis.sentimentAnalysis.summary,
        },
        profitPossibilityScore: analysis.profitPossibilityScore,
        createdAt: new Date(),
      };

      const docRef = await adminDb.collection("tradeSignals").add({
        ...signal,
        createdAt: new Date(),
      });

      signal.id = docRef.id;
      broadcast?.("signal", signal);
      generatedSignals.push(signal);
      agentState.signalsGenerated++;

      const resultLine = `[scraper] ${company.symbol}: ${analysis.signal} (confidence: ${analysis.confidence}%, PPS: ${analysis.profitPossibilityScore})`;
      broadcast?.("agentLog", { line: resultLine });
      console.log(resultLine);
    } catch (err) {
      const errLine = `[scraper] Failed to process headline "${item.title}": ${err instanceof Error ? err.message : String(err)}`;
      broadcast?.("agentLog", { line: errLine });
      console.error(
        `[scraper] Failed to process headline "${item.title}":`,
        err
      );
    }
  }

  if (generatedSignals.length > 0) {
    await checkTrackedTradesForSellAlerts(generatedSignals, broadcast);
  }

  agentState.status = "idle";
  broadcast?.("agentState", agentState);
  const doneLine = `[scraper] Cycle complete. Generated ${agentState.signalsGenerated} signals, skipped ${skippedDuplicates} duplicates.`;
  broadcast?.("agentLog", { line: doneLine });
  console.log(doneLine);
}
