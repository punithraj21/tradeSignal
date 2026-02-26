export type Direction = "LONG" | "SHORT";

export interface Position {
  id?: string;
  userId: string;
  symbol: string;
  entryPrice: number;
  qty: number;
  direction: Direction;
  unrealisedPnl: number;
  broker: string;
  openedAt: Date;
}
