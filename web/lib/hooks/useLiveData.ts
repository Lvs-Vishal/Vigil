"use client";

// useLiveData — SWR-backed 30-second polling hook for the Nodeframe dashboard.
//
// Why SWR instead of raw setInterval + fetch?
//   • SWR deduplicates requests — multiple components can call useSWR with the
//     same key and only ONE network request fires.
//   • Built-in stale-while-revalidate: the UI keeps the last good data while
//     the background refresh runs, eliminating the "flash to empty" jitter that
//     a setState-on-error pattern causes.
//   • onSuccess / onError callbacks are stable — no stale-closure pitfalls.
//   • revalidateOnFocus: true (default) re-fetches when the demo window is
//     tabbed back to, which is great for a hackathon live demo.
//
// RLS note: all tables have RLS disabled so the ESP32 can insert via the anon
// key. Supabase Realtime's postgres_changes events require RLS; the fetch-based
// approach is the safe alternative.
import useSWR from "swr";
import type { SeedData } from "@/lib/data";

export type PollStatus = "connecting" | "live" | "error";

const POLL_INTERVAL_MS = 30_000;

const LIVE_DATA_KEY = "/api/live-data";

async function fetcher(url: string): Promise<SeedData> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<SeedData>;
}

interface UseLiveDataResult {
  /**
   * Latest snapshot. Always defined because fallbackData is provided —
   * SWR may type it as `SeedData | undefined` at the generic level, but we
   * cast it here to `SeedData` so consumers don't need null guards everywhere.
   */
  data: SeedData;
  /** Coarse connection status for the TopBar indicator. */
  pollStatus: PollStatus;
}

/**
 * Polls GET /api/live-data every 30 seconds via SWR.
 *
 * `fallbackData` ensures data is **always** defined — SWR will synchronously
 * return `initialData` on first render, then revalidate in the background.
 * No loading state, no jitter.
 */
export function useLiveData(initialData: SeedData): UseLiveDataResult {
  const { data, error, isLoading } = useSWR<SeedData>(LIVE_DATA_KEY, fetcher, {
    // Seed the cache with the server-rendered initial data so there's no
    // loading flash on first paint — SWR will revalidate in the background.
    fallbackData: initialData,
    refreshInterval: POLL_INTERVAL_MS,
    // Keep the previous data visible while a new request is in flight.
    keepPreviousData: true,
    // Revalidate when the tab is focused (great for live demo).
    revalidateOnFocus: true,
    // Don't retry more than twice on error — we have the fallback.
    errorRetryCount: 2,
    // Suppress the default console.error on retries.
    onErrorRetry: (err, _key, _config, revalidate, { retryCount }) => {
      if (retryCount >= 2) return;
      setTimeout(() => revalidate({ retryCount }), 10_000);
    },
  });

  let pollStatus: PollStatus;
  if (error) {
    pollStatus = "error";
  } else if (isLoading) {
    pollStatus = "connecting";
  } else {
    pollStatus = "live";
  }

  // fallbackData guarantees data is never undefined; cast to assert this.
  return { data: (data ?? initialData) as SeedData, pollStatus };
}
