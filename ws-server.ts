import type { ServerWebSocket } from "bun";
import { scraperAgent } from "./src/services/scraper.agent";

const SCRAPE_INTERVAL_MS = 5 * 60 * 1000;
const PORT = Number(process.env.WS_PORT) || 3001;
const MAX_CACHED_SIGNALS = 50;

type WSData = { connectedAt: number };

const clients = new Set<ServerWebSocket<WSData>>();

let lastAgentState: unknown = {
  status: "idle",
  lastRun: null,
  signalsGenerated: 0,
};

const recentSignals: unknown[] = [];

let scrapeInProgress = false;

export function broadcast(type: string, data: unknown) {
  if (type === "agentState") lastAgentState = data;
  if (type === "signal") {
    recentSignals.unshift(data);
    if (recentSignals.length > MAX_CACHED_SIGNALS)
      recentSignals.length = MAX_CACHED_SIGNALS;
  }
  const message = JSON.stringify({ type, data, timestamp: Date.now() });
  for (const ws of clients) {
    ws.send(message);
  }
}

export function clearCachedSignals() {
  recentSignals.length = 0;
}

async function runScraper() {
  if (scrapeInProgress) {
    console.log("[ws-server] Scrape already in progress, skipping.");
    return;
  }
  scrapeInProgress = true;
  try {
    await scraperAgent(broadcast);
  } finally {
    scrapeInProgress = false;
  }
}

function handleClientCommand(
  ws: ServerWebSocket<WSData>,
  raw: string | Buffer,
) {
  try {
    const msg = JSON.parse(typeof raw === "string" ? raw : raw.toString()) as {
      command: string;
    };

    switch (msg.command) {
      case "refetch":
        console.log("[ws-server] Manual refetch requested by client.");
        runScraper();
        break;
      case "clearSignals":
        clearCachedSignals();
        break;
      default:
        ws.send(
          JSON.stringify({
            type: "error",
            data: { message: `Unknown command: ${msg.command}` },
            timestamp: Date.now(),
          }),
        );
    }
  } catch {
    // Malformed message — ignore
  }
}

const server = Bun.serve<WSData>({
  port: PORT,
  fetch(req, server) {
    const upgraded = server.upgrade(req, {
      data: { connectedAt: Date.now() },
    });
    if (upgraded) return undefined;
    return new Response("Trade Signal WS — upgrade required", { status: 426 });
  },
  websocket: {
    open(ws) {
      clients.add(ws);
      ws.send(
        JSON.stringify({
          type: "connected",
          data: { clients: clients.size },
          timestamp: Date.now(),
        }),
      );
      ws.send(
        JSON.stringify({
          type: "agentState",
          data: lastAgentState,
          timestamp: Date.now(),
        }),
      );
      if (recentSignals.length > 0) {
        ws.send(
          JSON.stringify({
            type: "signalBatch",
            data: recentSignals,
            timestamp: Date.now(),
          }),
        );
      }
    },
    close(ws) {
      clients.delete(ws);
    },
    message(ws, message) {
      handleClientCommand(ws, message);
    },
  },
});

console.log(`[ws-server] listening on ws://localhost:${server.port}`);

runScraper();
setInterval(runScraper, SCRAPE_INTERVAL_MS);
