import { request } from "undici";

/**
 * Fetches current prices for NSE symbols.
 * baseUrl from app config (e.g. Yahoo Finance chart API).
 */
export async function getPrices(
  symbols: string[],
  baseUrl: string
): Promise<Record<string, number>> {
  if (symbols.length === 0 || !baseUrl) return {};
  const out: Record<string, number> = {};
  const unique = [...new Set(symbols.map((s) => s.toUpperCase().trim()))];
  const chartBase = baseUrl.replace(/\/$/, "");

  await Promise.all(
    unique.map(async (symbol) => {
      try {
        const ticker = symbol.endsWith(".NS") ? symbol : `${symbol}.NS`;
        const url = `${chartBase}/${ticker}?interval=1d&range=1d`;
        const { statusCode, body } = await request(url, {
          method: "GET",
          headers: { "User-Agent": "Tijaara/1.0" },
        });
        if (statusCode < 200 || statusCode >= 300) return;
        const data = (await body.json()) as {
          chart?: { result?: Array<{ meta?: { regularMarketPrice?: number }; indicators?: unknown }> };
        };
        const price = data.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (typeof price === "number" && price > 0) out[symbol] = price;
      } catch {
        // Skip failed symbol
      }
    })
  );

  return out;
}
