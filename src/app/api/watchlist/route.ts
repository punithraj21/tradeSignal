import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

const COLLECTION = "watchlist";

function getDocRef(userId: string) {
  return adminDb.collection(COLLECTION).doc(userId);
}

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  try {
    const doc = await getDocRef(userId).get();
    const symbols: string[] = doc.exists ? (doc.data()?.symbols ?? []) : [];
    return NextResponse.json({ symbols });
  } catch (error) {
    console.error("[api/watchlist] GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch watchlist" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, symbols } = body;

    if (!userId || !Array.isArray(symbols)) {
      return NextResponse.json({ error: "userId and symbols[] required" }, { status: 400 });
    }

    const ref = getDocRef(userId);
    await ref.set({ userId, symbols, updatedAt: new Date() }, { merge: true });

    return NextResponse.json({ symbols });
  } catch (error) {
    console.error("[api/watchlist] PUT Error:", error);
    return NextResponse.json({ error: "Failed to save watchlist" }, { status: 500 });
  }
}
