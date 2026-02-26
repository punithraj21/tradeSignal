"use client";

import Link from "next/link";
import { ConfigTable } from "@/components/dashboard/ConfigTable";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
        >
          ← Dashboard
        </Link>
        <h1 className="text-base font-semibold text-zinc-100">Settings</h1>
      </div>
      <ConfigTable />
      <p className="text-[11px] text-zinc-600">
        <strong>Cron:</strong> Call <code className="rounded bg-zinc-800 px-1 font-mono">GET /api/cron/check-holdings</code> every{" "}
        <code className="rounded bg-zinc-800 px-1 font-mono">holdingsCheckIntervalMinutes</code> (e.g. Vercel Cron or external scheduler).
        Optionally set <code className="rounded bg-zinc-800 px-1 font-mono">CRON_SECRET</code> and send{" "}
        <code className="rounded bg-zinc-800 px-1 font-mono">Authorization: Bearer &lt;secret&gt;</code>.
        <br />
        <strong>Scrape:</strong> <code className="rounded bg-zinc-800 px-1 font-mono">scrapeIntervalMinutes</code> is stored here; if using the Bun WS server, restart it or add config polling for the interval to take effect.
      </p>
    </div>
  );
}
