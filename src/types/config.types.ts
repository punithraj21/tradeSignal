/** App-wide config keys stored in Firestore. No hardcoded defaults in app logic — seed DB when empty. */
export type AppConfigKey =
  | "scrapeIntervalMinutes"
  | "holdingsCheckIntervalMinutes"
  | "profitThresholdPercent"
  | "lossThresholdPercent"
  | "thresholdCooldownHours"
  | "cacheTtlSeconds"
  | "defaultAiModelId"
  | "aiProvider"
  | "aiModel"
  | "signalsLimit"
  | "notificationsLimit"
  | "maxCronHoldingsBatch"
  | "pollinationsBaseUrl"
  | "yahooChartBaseUrl"
  | "buySources"
  | "brokerLinks"
  | "maxNotificationsDeleteBatch"
  | "discordWebhookUrl";

export type AppConfigValue = number | string | boolean;

export interface AppConfigRecord {
  key: AppConfigKey;
  value: AppConfigValue;
  updatedAt: Date;
}

/** Used only to seed the config doc when it is empty. All runtime config is read from DB. */
export const CONFIG_SEED: Record<AppConfigKey, AppConfigValue> = {
  scrapeIntervalMinutes: 5,
  holdingsCheckIntervalMinutes: 15,
  profitThresholdPercent: 10,
  lossThresholdPercent: -5,
  thresholdCooldownHours: 6,
  cacheTtlSeconds: 60,
  defaultAiModelId: "",
  aiProvider: "pollinations",
  aiModel: "openai",
  signalsLimit: 50,
  notificationsLimit: 100,
  maxCronHoldingsBatch: 500,
  pollinationsBaseUrl: "https://gen.pollinations.ai/v1",
  yahooChartBaseUrl: "https://query1.finance.yahoo.com/v8/finance/chart",
  buySources: JSON.stringify(["Groww", "Zerodha", "Google Finance", "TradingView", "NSE India", "Other"]),
  brokerLinks: JSON.stringify([
    { name: "Groww", urlTemplate: "https://groww.in/search?q={{symbol}}" },
    { name: "Zerodha", urlTemplate: "https://zerodha.com/search/#?q={{symbol}}" },
    { name: "Google Finance", urlTemplate: "https://www.google.com/finance/quote/{{symbol}}:NSE" },
    { name: "TradingView", urlTemplate: "https://www.tradingview.com/symbols/NSE-{{symbol}}/" },
    { name: "NSE India", urlTemplate: "https://www.nseindia.com/get-quotes/equity?symbol={{symbol}}" },
  ]),
  maxNotificationsDeleteBatch: 500,
  discordWebhookUrl: "",
};
