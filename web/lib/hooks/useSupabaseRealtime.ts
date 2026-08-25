"use client";

// Supabase Realtime subscription hook for the dashboard.
//
// Subscribes to INSERT events on `readings` and `events` tables and calls
// the provided callbacks so DashboardApp can update its local React state
// without ever triggering a full router.refresh() re-render.
//
// Lifecycle:
//   - Mounts: opens one channel named "nodeframe-dashboard"
//   - Unmounts: calls channel.unsubscribe() synchronously — no leaked sockets
//   - null client: exits immediately, connectionStatus stays "closed"
import { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabase";

export type RealtimeStatus = "connecting" | "live" | "closed";

export interface NewReading {
  module_id: string;
  value: number;
  recorded_at: string;
}

export interface NewEvent {
  module_id: string | null;
  event_type: string;
  severity: "info" | "warning" | "critical";
  message: string;
  created_at: string;
}

interface UseSupabaseRealtimeOptions {
  onReading: (reading: NewReading) => void;
  onEvent: (event: NewEvent) => void;
}

export function useSupabaseRealtime({
  onReading,
  onEvent,
}: UseSupabaseRealtimeOptions): RealtimeStatus {
  const [status, setStatus] = useState<RealtimeStatus>(
    supabaseClient ? "connecting" : "closed",
  );

  useEffect(() => {
    if (!supabaseClient) {
      setStatus("closed");
      return;
    }

    // A single multiplexed channel handles both table subscriptions.
    // Supabase multiplexes postgres_changes events over one WebSocket.
    const channel = supabaseClient
      .channel("nodeframe-dashboard")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "readings" },
        (payload) => {
          const row = payload.new as NewReading;
          onReading({
            module_id: row.module_id,
            value: Number(row.value),
            recorded_at: row.recorded_at,
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "events" },
        (payload) => {
          const row = payload.new as NewEvent;
          onEvent({
            module_id: row.module_id ?? null,
            event_type: row.event_type,
            severity: row.severity,
            message: row.message,
            created_at: row.created_at,
          });
        },
      )
      .subscribe((realtimeStatus) => {
        if (realtimeStatus === "SUBSCRIBED") {
          setStatus("live");
        } else if (
          realtimeStatus === "CLOSED" ||
          realtimeStatus === "CHANNEL_ERROR"
        ) {
          setStatus("closed");
        }
      });

    return () => {
      // Synchronous teardown — no async leak, no stale handlers on remount.
      channel.unsubscribe();
      setStatus("closed");
    };
    // onReading and onEvent are stable useCallback refs supplied by DashboardApp.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return status;
}
