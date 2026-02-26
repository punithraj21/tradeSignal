export type SignalAction = "BUY" | "SELL" | "HOLD";

export interface Technicals {
  rsi: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
}

export interface ReputationScore {
  leadership: number;
  conduct: number;
  financialPerformance: number;
  composite: number;
}

export interface SignalReasoning {
  technical: string;
  fundamental: string;
  sentiment: string;
}

export interface TradeSignal {
  id?: string;
  symbol: string;
  companyName: string;
  headline: string;
  sourceUrl: string;
  sourceName: string;
  signal: SignalAction;
  confidence: number;
  reputationScore: ReputationScore;
  technicals: Technicals;
  reasoning: SignalReasoning;
  profitPossibilityScore: number;
  createdAt: Date;
}

export interface TrackedTrade {
  id?: string;
  userId: string;
  symbol: string;
  companyName: string;
  signalId: string;
  headline: string;
  confidence: number;
  profitPossibilityScore: number;
  trackedAt: Date;
  status: "watching" | "sell_triggered";
  sellTriggeredAt?: Date;
  sellReason?: string;
}

export interface MarketTick {
  symbol: string;
  ltp: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: number;
}

export interface WSMessage {
  type: "tick" | "signal" | "agentState" | "signalBatch" | "sellAlert";
  data: MarketTick | TradeSignal | AgentState | TradeSignal[] | SellAlert;
}

export interface SellAlert {
  symbol: string;
  companyName: string;
  reason: string;
  confidence: number;
  triggeredAt: Date;
}

export interface AgentState {
  status: "idle" | "scraping" | "analyzing" | "signaling";
  lastRun: Date | null;
  signalsGenerated: number;
}

export type NotificationPriority = "high" | "normal" | "low";

export interface NotificationRecord {
  id?: string;
  userId: string;
  type: "sell_alert" | "info" | "success" | "error";
  title: string;
  message: string;
  symbol?: string;
  priority: NotificationPriority;
  readAt: Date | null;
  createdAt: Date;
}
