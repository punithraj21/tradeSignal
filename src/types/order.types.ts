export type OrderType = "MARKET" | "LIMIT" | "SL";
export type OrderSide = "BUY" | "SELL";
export type OrderStatus =
  | "PENDING"
  | "OPEN"
  | "FILLED"
  | "PARTIALLY_FILLED"
  | "CANCELLED"
  | "REJECTED";

export interface Order {
  id?: string;
  userId: string;
  symbol: string;
  type: OrderType;
  side: OrderSide;
  qty: number;
  price: number;
  status: OrderStatus;
  broker: string;
  externalOrderId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderRequest {
  symbol: string;
  type: OrderType;
  side: OrderSide;
  qty: number;
  price: number;
  broker: string;
}

export interface OrderResponse {
  orderId: string;
  status: OrderStatus;
  message: string;
}
