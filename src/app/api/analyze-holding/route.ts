import { NextRequest, NextResponse } from "next/server";
import { streamAnalyzeHoldingMarket } from "@/services/ai.service";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, companyName, forceReanalyze } = body as {
      symbol?: string;
      companyName?: string;
      forceReanalyze?: boolean;
    };
    if (!symbol || typeof symbol !== "string") {
      return NextResponse.json({ error: "symbol required" }, { status: 400 });
    }
    const name = typeof companyName === "string" ? companyName : symbol;
    const result = await streamAnalyzeHoldingMarket(symbol, name, {
      forceReanalyze: Boolean(forceReanalyze),
    });
    return result.toTextStreamResponse();
  } catch (error) {
    console.error("[api/analyze-holding] Error:", error);
    return NextResponse.json(
      { error: "Analysis failed", message: String(error) },
      { status: 500 }
    );
  }
}
