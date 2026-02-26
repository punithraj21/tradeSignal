import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { z } from "zod/v4";
import type { Order } from "@/types";

const CreateOrderSchema = z.object({
  symbol: z.string().min(1),
  type: z.enum(["MARKET", "LIMIT", "SL"]),
  side: z.enum(["BUY", "SELL"]),
  qty: z.number().positive(),
  price: z.number().nonnegative(),
  broker: z.string().min(1),
});

export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const snapshot = await adminDb
      .collection("orders")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const orders = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Order, "id">),
    }));

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("[api/orders] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = CreateOrderSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid order data", details: result.error.message },
        { status: 400 }
      );
    }

    const now = new Date();
    const order = {
      ...result.data,
      userId,
      status: "PENDING" as const,
      externalOrderId: null,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await adminDb.collection("orders").add(order);

    return NextResponse.json(
      { id: docRef.id, ...order },
      { status: 201 }
    );
  } catch (error) {
    console.error("[api/orders] Error:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
