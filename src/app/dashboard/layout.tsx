"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useMarketStream } from "@/hooks/useMarketStream";
import { NotificationBell } from "@/components/dashboard/NotificationBell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  useMarketStream();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-tight">Trade Signal</h1>
            <span className="rounded-full bg-emerald-900/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-400">
              Live
            </span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Link
              href="/dashboard/settings"
              className="rounded-md px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            >
              Settings
            </Link>
            <span className="text-xs text-zinc-500">{user.email}</span>
            <button
              onClick={signOut}
              className="rounded-md px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
