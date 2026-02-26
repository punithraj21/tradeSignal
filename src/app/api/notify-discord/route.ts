import { NextRequest, NextResponse } from "next/server";
import { sendDiscordNotification } from "@/lib/discord";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      title,
      message,
      symbol,
      sourceName,
      sourceUrl,
      headline,
      companyName,
      confidence,
      signal,
      profitPossibilityScore,
    } = body as {
      title?: string;
      message?: string;
      symbol?: string;
      sourceName?: string;
      sourceUrl?: string;
      headline?: string;
      companyName?: string;
      confidence?: number;
      signal?: string;
      profitPossibilityScore?: number;
    };
    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "title required" },
        { status: 400 }
      );
    }
    const sent = await sendDiscordNotification({
      title,
      message: typeof message === "string" ? message : undefined,
      symbol: typeof symbol === "string" ? symbol : undefined,
      sourceName: typeof sourceName === "string" ? sourceName : undefined,
      sourceUrl: typeof sourceUrl === "string" ? sourceUrl : undefined,
      headline: typeof headline === "string" ? headline : undefined,
      companyName: typeof companyName === "string" ? companyName : undefined,
      confidence: typeof confidence === "number" ? confidence : undefined,
      signal: typeof signal === "string" ? signal : undefined,
      profitPossibilityScore:
        typeof profitPossibilityScore === "number" ? profitPossibilityScore : undefined,
    });
    return NextResponse.json({ sent });
  } catch (error) {
    console.error("[api/notify-discord] Error:", error);
    return NextResponse.json(
      { error: "Discord notification failed" },
      { status: 500 }
    );
  }
}
