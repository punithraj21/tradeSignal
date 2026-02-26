import type { Holding, Position, OrderRequest, OrderResponse } from "@/types";

export interface BrokerCredentials {
  apiKey: string;
  clientId: string;
  password?: string;
  totp?: string;
}

export interface BrokerAdapter {
  readonly name: string;
  login(creds: BrokerCredentials): Promise<string>;
  placeOrder(
    sessionToken: string,
    order: OrderRequest
  ): Promise<OrderResponse>;
  getPositions(sessionToken: string): Promise<Position[]>;
  getHoldings(sessionToken: string): Promise<Holding[]>;
  cancelOrder(
    sessionToken: string,
    orderId: string
  ): Promise<void>;
}

// ---------------------------------------------------------------------------
// Angel One SmartAPI — https://smartapi.angelone.in/docs
// ---------------------------------------------------------------------------
export class AngelOneAdapter implements BrokerAdapter {
  readonly name = "AngelOne";
  private baseUrl = "https://apiconnect.angelone.in";

  async login(creds: BrokerCredentials): Promise<string> {
    // POST /rest/auth/angelbroking/user/v1/loginByPassword
    console.log(`[${this.name}] login stub for client ${creds.clientId}`);
    return `angel-session-${Date.now()}`;
  }

  async placeOrder(
    sessionToken: string,
    order: OrderRequest
  ): Promise<OrderResponse> {
    // POST /rest/secure/angelbroking/order/v1/placeOrder
    console.log(
      `[${this.name}] placeOrder stub — ${order.side} ${order.qty}x ${order.symbol}`
    );
    return {
      orderId: `AO-${Date.now()}`,
      status: "PENDING",
      message: "Order placed (stub)",
    };
  }

  async getPositions(sessionToken: string): Promise<Position[]> {
    // GET /rest/secure/angelbroking/order/v1/getPosition
    console.log(`[${this.name}] getPositions stub`);
    return [];
  }

  async getHoldings(sessionToken: string): Promise<Holding[]> {
    // GET /rest/secure/angelbroking/portfolio/v1/getHolding
    console.log(`[${this.name}] getHoldings stub`);
    return [];
  }

  async cancelOrder(
    sessionToken: string,
    orderId: string
  ): Promise<void> {
    // POST /rest/secure/angelbroking/order/v1/cancelOrder
    console.log(`[${this.name}] cancelOrder stub for ${orderId}`);
  }
}

// ---------------------------------------------------------------------------
// Dhan HQ — https://dhanhq.co/docs/v2/
// ---------------------------------------------------------------------------
export class DhanAdapter implements BrokerAdapter {
  readonly name = "Dhan";
  private baseUrl = "https://api.dhan.co/v2";

  async login(creds: BrokerCredentials): Promise<string> {
    // Dhan uses pre-generated access tokens
    console.log(`[${this.name}] login stub for client ${creds.clientId}`);
    return creds.apiKey;
  }

  async placeOrder(
    sessionToken: string,
    order: OrderRequest
  ): Promise<OrderResponse> {
    // POST /orders
    console.log(
      `[${this.name}] placeOrder stub — ${order.side} ${order.qty}x ${order.symbol}`
    );
    return {
      orderId: `DH-${Date.now()}`,
      status: "PENDING",
      message: "Order placed (stub)",
    };
  }

  async getPositions(sessionToken: string): Promise<Position[]> {
    // GET /positions
    console.log(`[${this.name}] getPositions stub`);
    return [];
  }

  async getHoldings(sessionToken: string): Promise<Holding[]> {
    // GET /holdings
    console.log(`[${this.name}] getHoldings stub`);
    return [];
  }

  async cancelOrder(
    sessionToken: string,
    orderId: string
  ): Promise<void> {
    // DELETE /orders/{orderId}
    console.log(`[${this.name}] cancelOrder stub for ${orderId}`);
  }
}

// ---------------------------------------------------------------------------
// Fyers — https://myapi.fyers.in/docs/
// ---------------------------------------------------------------------------
export class FyersAdapter implements BrokerAdapter {
  readonly name = "Fyers";
  private baseUrl = "https://api-t1.fyers.in/api/v3";

  async login(creds: BrokerCredentials): Promise<string> {
    // Fyers uses OAuth — /generate-authcode → /validate-authcode
    console.log(`[${this.name}] login stub for client ${creds.clientId}`);
    return `fyers-session-${Date.now()}`;
  }

  async placeOrder(
    sessionToken: string,
    order: OrderRequest
  ): Promise<OrderResponse> {
    // POST /orders/place-order
    console.log(
      `[${this.name}] placeOrder stub — ${order.side} ${order.qty}x ${order.symbol}`
    );
    return {
      orderId: `FY-${Date.now()}`,
      status: "PENDING",
      message: "Order placed (stub)",
    };
  }

  async getPositions(sessionToken: string): Promise<Position[]> {
    // GET /positions
    console.log(`[${this.name}] getPositions stub`);
    return [];
  }

  async getHoldings(sessionToken: string): Promise<Holding[]> {
    // GET /holdings
    console.log(`[${this.name}] getHoldings stub`);
    return [];
  }

  async cancelOrder(
    sessionToken: string,
    orderId: string
  ): Promise<void> {
    // DELETE /orders/{orderId}
    console.log(`[${this.name}] cancelOrder stub for ${orderId}`);
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------
export function createBrokerAdapter(broker: string): BrokerAdapter {
  switch (broker.toLowerCase()) {
    case "angelone":
      return new AngelOneAdapter();
    case "dhan":
      return new DhanAdapter();
    case "fyers":
      return new FyersAdapter();
    default:
      throw new Error(`Unsupported broker: ${broker}`);
  }
}
