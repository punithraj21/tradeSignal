export interface Holding {
  id?: string;
  userId: string;
  symbol: string;
  qty: number;
  avgBuyPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  sector: string;
  /** Where the user bought (e.g. Groww, Zerodha). */
  buySource?: string;
  updatedAt: Date;
}
