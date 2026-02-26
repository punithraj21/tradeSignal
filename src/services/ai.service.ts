import { generateText, streamText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { jsonrepair } from "jsonrepair";
import { adminDb } from "@/lib/firebase-admin";
import { loadAppConfigFromDb } from "@/lib/get-app-config";
import type { AIModelConfig } from "@/types";

// -- Cached model config from Firestore -------------------------------------

let _cachedConfig: AIModelConfig | null = null;
let _cacheTimestamp = 0;
let _cacheTtlMs = 0;

async function getActiveModelConfig(): Promise<AIModelConfig> {
  const now = Date.now();
  if (_cachedConfig && _cacheTtlMs > 0 && now - _cacheTimestamp < _cacheTtlMs) {
    return _cachedConfig;
  }

  const appConfig = await loadAppConfigFromDb();
  _cacheTtlMs = Number(appConfig.cacheTtlSeconds) * 1000;

  const snapshot = await adminDb
    .collection("aiModels")
    .where("isActive", "==", true)
    .where("isDefault", "==", true)
    .limit(1)
    .get();

  if (!snapshot.empty) {
    const doc = snapshot.docs[0]!;
    _cachedConfig = { id: doc.id, ...(doc.data() as Omit<AIModelConfig, "id">) };
    _cacheTimestamp = now;
    return _cachedConfig;
  }

  const envProvider = process.env.AI_PROVIDER ?? "pollinations";
  _cachedConfig = {
    provider: envProvider as AIModelConfig["provider"],
    modelId: envProvider === "pollinations" ? "openai" : "anthropic/claude-sonnet-4",
    displayName: "Default (env fallback)",
    isActive: true,
    isDefault: true,
    capabilities: ["chat", "structured-output"],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  _cacheTimestamp = now;
  return _cachedConfig;
}

export function invalidateModelCache() {
  _cachedConfig = null;
  _cacheTimestamp = 0;
  _cacheTtlMs = 0;
}

// -- Provider factory -------------------------------------------------------

async function buildModel(config: AIModelConfig) {
  if (config.provider === "pollinations") {
    const appConfig = await loadAppConfigFromDb();
    const baseURL = String(appConfig.pollinationsBaseUrl ?? "").trim();
    if (!baseURL) throw new Error("pollinationsBaseUrl not set in app config");
    const pollinations = createOpenAICompatible({
      name: "pollinations",
      baseURL,
      apiKey: process.env.POLLINATIONS_API_KEY ?? "",
    });
    return pollinations.chatModel(config.modelId);
  }

  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY ?? "",
  });
  return openrouter.chat(config.modelId);
}

async function getModel() {
  const config = await getActiveModelConfig();
  return buildModel(config);
}

/** Extract JSON object from model text. Uses jsonrepair; on failure tries to isolate a JSON block, then returns fallback. */
function extractJsonFromText(
  text: string,
  fallback?: Record<string, unknown>
): Record<string, unknown> {
  const run = (input: string): Record<string, unknown> => {
    const repaired = jsonrepair(input);
    return JSON.parse(repaired) as Record<string, unknown>;
  };
  try {
    return run(text);
  } catch {
    // Try to isolate a single JSON object (first { to last })
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first !== -1 && last !== -1 && last > first) {
      try {
        return run(text.slice(first, last + 1));
      } catch {
        // fall through to fallback
      }
    }
  }
  if (fallback) return fallback;
  throw new Error("Could not extract valid JSON from model output");
}

function dig(obj: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    const lower = key.toLowerCase();
    for (const [k, v] of Object.entries(obj)) {
      if (k.toLowerCase() === lower || k.toLowerCase().replace(/[_\s]/g, "") === lower.replace(/[_\s]/g, "")) {
        return v;
      }
    }
  }
  return undefined;
}

function num(val: unknown, fallback: number): number {
  if (typeof val === "number" && isFinite(val)) return Math.max(0, Math.min(100, val));
  if (typeof val === "string") {
    const n = parseFloat(val);
    if (isFinite(n)) return Math.max(0, Math.min(100, n));
  }
  return fallback;
}

function str(val: unknown, fallback: string): string {
  if (typeof val === "string" && val.trim()) return val.trim();
  if (typeof val === "object" && val !== null) {
    const obj = val as Record<string, unknown>;
    const candidate = obj.analysis ?? obj.summary ?? obj.text ?? obj.content ?? Object.values(obj).find(v => typeof v === "string" && (v as string).length > 20);
    if (typeof candidate === "string") return candidate;
  }
  return fallback;
}

// -- Company Extraction from Headline ----------------------------------------

export interface CompanyExtraction {
  symbol: string;
  companyName: string;
}

export async function extractCompanyFromHeadline(
  headline: string
): Promise<CompanyExtraction> {
  const model = await getModel();

  const { text } = await generateText({
    model,
    prompt: `Extract the primary Indian stock/company from this financial news headline.
Return ONLY a JSON object with exactly these keys:
- "symbol": the NSE ticker (e.g. "RELIANCE", "TCS", "INFY"). Use "MARKET" if no specific company.
- "companyName": the full company name (e.g. "Reliance Industries"). Use "Indian Market" if general.

No markdown, no explanation — just the JSON object.

Headline: ${headline}`,
  });

  const raw = extractJsonFromText(text, { symbol: "MARKET", companyName: "Unknown" });
  return {
    symbol: str(dig(raw, "symbol", "ticker", "nseSymbol"), "MARKET"),
    companyName: str(dig(raw, "companyName", "company_name", "company", "name"), "Unknown"),
  };
}

// -- Full Trade Analysis Agent -----------------------------------------------

export interface TradeAnalysis {
  signal: "BUY" | "SELL" | "HOLD";
  confidence: number;
  technicalAnalysis: {
    rsiEstimate: number;
    macdSignal: "bullish" | "bearish" | "neutral";
    summary: string;
  };
  fundamentalAnalysis: string;
  sentimentAnalysis: {
    leadership: number;
    conduct: number;
    financialPerformance: number;
    composite: number;
    summary: string;
  };
  profitPossibilityScore: number;
}

function normalizeTradeAnalysis(raw: Record<string, unknown>): TradeAnalysis {
  const techObj = (dig(raw, "technicalAnalysis", "technical", "technicals", "techAnalysis") ?? {}) as Record<string, unknown>;
  const fundRaw = dig(raw, "fundamentalAnalysis", "fundamental", "fundamentals", "fundAnalysis");
  const sentObj = (dig(raw, "sentimentAnalysis", "sentiment", "sentimentAndReputation", "reputation") ?? {}) as Record<string, unknown>;
  const verdictObj = (dig(raw, "finalVerdict", "verdict", "recommendation", "final") ?? {}) as Record<string, unknown>;

  const signalRaw = str(dig(raw, "signal") ?? dig(verdictObj, "signal", "action", "recommendation"), "HOLD").toUpperCase();
  const signal = (["BUY", "SELL", "HOLD"].includes(signalRaw) ? signalRaw : "HOLD") as TradeAnalysis["signal"];

  const confidence = num(dig(raw, "confidence") ?? dig(verdictObj, "confidence"), 50);

  const rsiRaw = dig(techObj, "rsiEstimate", "rsi", "RSI");
  const macdRaw = str(dig(techObj, "macdSignal", "macd", "MACD", "macdDirection", "trend"), "neutral").toLowerCase();
  const macdSignal = (["bullish", "bearish", "neutral"].includes(macdRaw) ? macdRaw : "neutral") as TradeAnalysis["technicalAnalysis"]["macdSignal"];
  const techSummary = str(dig(techObj, "summary", "analysis", "outlook"), "Technical analysis not available.");

  const fundamentalAnalysis = str(fundRaw, "Fundamental analysis not available.");

  const leadership = num(dig(sentObj, "leadership", "Leadership"), 50);
  const conduct = num(dig(sentObj, "conduct", "Conduct"), 50);
  const fp = num(dig(sentObj, "financialPerformance", "FinancialPerformance", "financial", "Financial"), 50);
  const compositeRaw = dig(sentObj, "composite", "Composite", "overall");
  const composite = compositeRaw !== undefined
    ? num(compositeRaw, 50)
    : Math.round(fp * 0.4 + leadership * 0.35 + conduct * 0.25);
  const sentSummary = str(dig(sentObj, "summary", "analysis"), "Sentiment analysis not available.");

  const pps = num(
    dig(raw, "profitPossibilityScore", "profitScore", "pps") ??
    dig(verdictObj, "profitPossibilityScore", "profitScore", "pps"),
    composite
  );

  return {
    signal,
    confidence,
    technicalAnalysis: {
      rsiEstimate: num(rsiRaw, 50),
      macdSignal,
      summary: techSummary,
    },
    fundamentalAnalysis,
    sentimentAnalysis: { leadership, conduct, financialPerformance: fp, composite, summary: sentSummary },
    profitPossibilityScore: pps,
  };
}

export async function analyzeTradeSignal(
  newsText: string,
  symbol: string,
  companyName: string
): Promise<TradeAnalysis> {
  const model = await getModel();

  const { text } = await generateText({
    model,
    prompt: `You are an autonomous AI trading agent for the Indian stock market (NSE/BSE).
Analyze this news about ${symbol} (${companyName}) and return ONLY a JSON object — no markdown, no explanation.

Use EXACTLY this structure:
{
  "signal": "BUY" or "SELL" or "HOLD",
  "confidence": <number 0-100>,
  "technicalAnalysis": {
    "rsiEstimate": <number 0-100>,
    "macdSignal": "bullish" or "bearish" or "neutral",
    "summary": "<1-2 sentence technical outlook>"
  },
  "fundamentalAnalysis": "<2-3 sentence fundamental analysis>",
  "sentimentAnalysis": {
    "leadership": <number 0-100>,
    "conduct": <number 0-100>,
    "financialPerformance": <number 0-100>,
    "composite": <number 0-100, weighted: 40% financial + 35% leadership + 25% conduct>,
    "summary": "<1-2 sentence sentiment summary>"
  },
  "profitPossibilityScore": <number 0-100>
}

Rules:
- signal BUY if composite > 65 and bullish technicals
- signal SELL if composite < 35 or bearish with poor fundamentals
- signal HOLD otherwise
- rsiEstimate: 52-week high → RSI > 65, crashing → RSI < 35, neutral news → 40-60
- All scores 0-100, confidence reflects your certainty

News:
${newsText}`,
  });

  const fallback: Record<string, unknown> = {
    signal: "HOLD",
    confidence: 50,
    technicalAnalysis: { rsiEstimate: 50, macdSignal: "neutral", summary: "Analysis parse failed; defaulting to HOLD." },
    fundamentalAnalysis: "Unable to parse model output.",
    sentimentAnalysis: { leadership: 50, conduct: 50, financialPerformance: 50, composite: 50, summary: "" },
    profitPossibilityScore: 50,
  };
  const raw = extractJsonFromText(text, fallback);
  return normalizeTradeAnalysis(raw);
}

function buildHoldingAnalysisPrompt(
  companyName: string,
  symbol: string,
  options?: { forceReanalyze?: boolean }
): string {
  const base = `You are an expert equity analyst for the Indian stock market (NSE/BSE) who thinks creatively and independently.
Analyze ${companyName} (${symbol}) with fresh perspective: question consensus, consider contrarian angles, and highlight non-obvious factors (sector rotation, policy, competitive edge, or narrative shifts). Avoid generic boilerplate; every sentence should add insight specific to this name.

Include 4-5 short paragraphs:
1. **Price context & trend** — What the chart and recent move actually imply; any disconnect from news or sentiment.
2. **Fundamentals** — Sector position, business quality, margins or valuation in plain terms; what the market may be missing.
3. **Technical / momentum** — Support, resistance, or trend; how price could behave in different scenarios.
4. **Risks and catalysts** — Real near-term risks and concrete triggers (earnings, policy, industry) to watch.

5. **Conclusion (point-wise for decision-making)** — Use this structure so the reader can scan and act:
- **Verdict:** [HOLD | ADD | REDUCE] — one word.
- **Key metrics:** (2-4 bullets: the numbers or ratios that actually support your verdict).
- **Risks:** (1-3 bullets: main near-term risks).
- **Catalysts:** (1-3 bullets: positive triggers to watch).
- **Action:** (one short, concrete line: e.g. "Add on dips above ₹X" or "Hold; review after Q3").

Be clear and professional. Think creatively; surprise the reader with at least one non-obvious point. Use bullet points only in the Conclusion section as above.`;
  if (options?.forceReanalyze) {
    const ts = new Date().toISOString();
    return `${base}\n\nProvide a fresh analysis as of the current date (${ts}). Do not repeat cached or generic conclusions; base your view on the latest context.`;
  }
  return base;
}

/** Generate AI market / share price analysis for a holding (symbol + company). */
export async function analyzeHoldingMarket(
  symbol: string,
  companyName: string,
  options?: { forceReanalyze?: boolean }
): Promise<string> {
  const model = await getModel();
  const { text } = await generateText({
    model,
    prompt: buildHoldingAnalysisPrompt(companyName, symbol, options),
  });
  return text.trim();
}

/** Stream AI market analysis for a holding. Returns stream result for toTextStreamResponse(). */
export async function streamAnalyzeHoldingMarket(
  symbol: string,
  companyName: string,
  options?: { forceReanalyze?: boolean }
) {
  const model = await getModel();
  return streamText({
    model,
    prompt: buildHoldingAnalysisPrompt(companyName, symbol, options),
  });
}
