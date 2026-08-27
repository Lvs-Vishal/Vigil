"use client";

import { useMemo, useState } from "react";
import type { MarketplacePlugin, SeedData } from "@/lib/data";
import { computeStats, fmtNumber, modulesInSlotOrder, seriesColorFor, uptimeLabel } from "@/lib/data";
import { useLiveData } from "@/lib/hooks/useLiveData";
import { ActivityLog } from "./ActivityLog";
import { AIInsights } from "./AIInsights";
import { AlertIcon, ClockIcon, ModulesIcon, PulseIcon } from "./icons";
import { MarketplaceGrid } from "./MarketplaceGrid";
import { ModuleCard } from "./ModuleCard";
import { StatTile } from "./StatTile";
import { TopBar } from "./TopBar";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";
import { buildMergedLog, overallStatus } from "./utils";
import { supabaseClient } from "@/lib/supabase";
import type { LogItem, ModuleRuntime } from "./utils";

// ── Virtual clock tick ──────────────────────────────────────────────────────
// The virtual clock still uses Date.now() + elapsed for the header timestamp.
// We keep the 1s clock tick via useEffect on the clock state, but module data
// now comes entirely from SWR — no local simulation tick needed.
import { useEffect, useRef } from "react";

const CLOCK_TICK_MS = 1000;

function initModules(data: SeedData): ModuleRuntime[] {
  return modulesInSlotOrder(data).map((def) => ({
    def,
    series: def.series ? def.series.map((p) => ({ ...p })) : null,
    status: def.status,
    latest: def.latest,
  }));
}

function pad2(n: number): string {
  return n < 10 ? "0" + n : "" + n;
}

export function DashboardApp({ initialData }: { initialData: SeedData }) {
  const reduceMotion = usePrefersReducedMotion();

  // ── SWR live data ──────────────────────────────────────────────────────────
  // SWR seeds from initialData (server snapshot) and revalidates every 30 s.
  // keepPreviousData means the UI never shows a blank/loading state between
  // polls — zero jitter.
  const { data: liveData, pollStatus } = useLiveData(initialData);

  // ── Local-only log additions (plugin installs) ─────────────────────────────
  const [localLogItems, setLocalLogItems] = useState<LogItem[]>([]);
  const [localInstalled, setLocalInstalled] = useState<MarketplacePlugin[]>([]);
  const [localUninstalled, setLocalUninstalled] = useState<Set<string>>(() => new Set());

  const virtualData = useMemo(() => {
    let newModules = liveData.modules.filter((m) => !localUninstalled.has(m.slug));
    
    const existingSlugs = new Set(newModules.map((m) => m.slug));
    const newlyInstalled = localInstalled
      .filter((p) => !existingSlugs.has(p.slug))
      .map((p) => ({
        id: `local-${p.slug}`,
        slug: p.slug,
        label: p.name,
        slot: p.target_slot || "B2",
        sensor_chip: p.sensor_chip || "",
        metric_key: p.metric_key || "",
        unit: p.unit || "",
        author: p.author,
        status: "good" as const,
        latest: 0,
        thresholds: p.thresholds || {},
        series: [],
        connected_at: new Date().toISOString(),
      }));

    newModules = [...newModules, ...newlyInstalled];

    const newMarketplace = liveData.marketplace.map((p) => {
      if (localUninstalled.has(p.slug)) return { ...p, installed: false };
      if (localInstalled.some((ip) => ip.slug === p.slug)) return { ...p, installed: true };
      return p;
    });

    return {
      ...liveData,
      modules: newModules,
      marketplace: newMarketplace,
    };
  }, [liveData, localInstalled, localUninstalled]);

  // Derive modules from the optimistic virtualData
  const modules: ModuleRuntime[] = useMemo(() => initModules(virtualData), [virtualData]);

  // Combined log: local items at the front, then DB events, deduped, capped.
  const logItems: LogItem[] = useMemo(() => {
    const fresh = buildMergedLog(virtualData.events, virtualData.modules);
    const freshKeys = new Set(fresh.map((i) => `${i.t}|${i.message}`));
    const localOnly = localLogItems.filter((i) => !freshKeys.has(`${i.t}|${i.message}`));
    return [...localOnly, ...fresh].slice(0, 200);
  }, [virtualData, localLogItems]);

  const marketplace = virtualData.marketplace;

  // ── Virtual clock ─────────────────────────────────────────────────────────
  // loadedAt/nowMs stay null through SSR and the first client render so the
  // server and hydration renders match (no hydration mismatch).
  const [loadedAt, setLoadedAt] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState<number | null>(null);

  // Use a ref to the seed timestamp so the clock doesn't drift on re-renders.
  const seedNowMs = useRef(new Date(initialData.generated_at).getTime());

  useEffect(() => {
    const t = Date.now();
    setLoadedAt(t);
    setNowMs(t);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => setNowMs(Date.now()), CLOCK_TICK_MS);
    return () => clearInterval(id);
  }, [reduceMotion]);

  const elapsedMs = reduceMotion || loadedAt == null ? 0 : (nowMs ?? loadedAt) - loadedAt;
  const virtualNow = useMemo(() => new Date(seedNowMs.current + elapsedMs), [elapsedMs]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => computeStats(liveData), [liveData]);

  const alertBreakdown = useMemo(() => {
    let warn = 0;
    let crit = 0;
    modules.forEach((m) => {
      if (m.status === "warning") warn++;
      else if (m.status === "critical") crit++;
    });
    return { warn, crit, total: warn + crit };
  }, [modules]);

  const overall = useMemo(() => overallStatus(modules.map((m) => m.status)), [modules]);

  const elapsedHrs = elapsedMs / 3_600_000;
  const uptimeHours = liveData.core.uptime_hours + elapsedHrs;
  const uptimeDays = Math.floor(uptimeHours / 24);
  const uptimeHrs = Math.floor(uptimeHours % 24);
  const uptimeMins = Math.floor((uptimeHours * 60) % 60);
  const uptimeValue =
    loadedAt == null ? uptimeLabel(liveData.core.uptime_hours) : `${uptimeDays}d ${uptimeHrs}h`;

  // ── Supabase Real-time Connection Status ───────────────────────────────────
  const [dbStatus, setDbStatus] = useState<"connected" | "offline">(supabaseClient ? "connected" : "offline");

  useEffect(() => {
    if (!supabaseClient) {
      setDbStatus("offline");
      return;
    }
    const channel = supabaseClient.channel("system-ping");
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setDbStatus("connected");
      } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
        setDbStatus("offline");
      }
    });
    return () => {
      supabaseClient?.removeChannel(channel);
    };
  }, []);

  // ── Plugin install/uninstall handler ───────────────────────────────────────
  function handleInstall(plugin: MarketplacePlugin) {
    setLocalUninstalled((prev) => {
      const next = new Set(prev);
      next.delete(plugin.slug);
      return next;
    });
    setLocalInstalled((prev) => [...prev, plugin]);
    setLocalLogItems((prev) => [
      {
        t: virtualNow.toISOString(),
        severity: "info",
        module: plugin.name,
        type: "plugin",
        message: `Plugin '${plugin.name}' (${plugin.slug}) installed — seated in slot ${plugin.target_slot ?? "unassigned"}.`,
      },
      ...prev,
    ]);

    // Push to database
    if (supabaseClient) {
      supabaseClient.from("modules").insert({
        id: `mod-${plugin.slug}-${Date.now()}`,
        plugin_slug: plugin.slug,
        label: plugin.name,
        slot: plugin.target_slot || "B2",
        status: "good",
        connected_at: new Date().toISOString(),
      }).then();
    }
  }

  function handleUninstall(plugin: MarketplacePlugin) {
    setLocalInstalled((prev) => prev.filter((p) => p.slug !== plugin.slug));
    setLocalUninstalled((prev) => {
      const next = new Set(prev);
      next.add(plugin.slug);
      return next;
    });
    setLocalLogItems((prev) => [
      {
        t: virtualNow.toISOString(),
        severity: "warning",
        module: plugin.name,
        type: "plugin",
        message: `Plugin '${plugin.name}' (${plugin.slug}) was uninstalled and removed from the dashboard.`,
      },
      ...prev,
    ]);

    // Delete from database
    if (supabaseClient) {
      supabaseClient.from("modules").delete().eq("plugin_slug", plugin.slug).then();
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <TopBar
        now={virtualNow}
        hubName={liveData.core.name}
        firmware={liveData.core.firmware}
        slotsUsed={liveData.core.slots_used}
        slotsTotal={liveData.core.slots_total}
        overallStatus={overall}
        reduceMotion={reduceMotion}
        pollStatus={pollStatus}
        dbStatus={dbStatus}
      />

      <div className="mx-auto w-full max-w-[1440px] flex-1 px-6 pb-16">
        <section className="mt-9" aria-label="System summary">
          <div className="grid grid-cols-1 gap-3.5 min-[560px]:grid-cols-2 min-[901px]:grid-cols-4">
            <StatTile
              label="Active modules"
              value={fmtNumber(stats.activeModules)}
              caption={<span>/ {stats.totalSlots}</span>}
              icon={<ModulesIcon />}
            />
            <StatTile
              label="Open alerts"
              value={fmtNumber(alertBreakdown.total)}
              caption={
                alertBreakdown.total === 0 ? (
                  <span>all modules nominal</span>
                ) : (
                  <>
                    {alertBreakdown.warn > 0 && (
                      <>
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-warning" />
                        <span>{alertBreakdown.warn} warning</span>
                      </>
                    )}
                    {alertBreakdown.crit > 0 && (
                      <>
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-critical" />
                        <span>{alertBreakdown.crit} critical</span>
                      </>
                    )}
                  </>
                )
              }
              icon={<AlertIcon />}
            />
            <StatTile
              label="Avg sample rate"
              value={fmtNumber(stats.avgSamplesPerHour)}
              caption={<span>/hr per module</span>}
              icon={<PulseIcon />}
            />
            <StatTile
              label="Core uptime"
              value={uptimeValue}
              caption={<span>since last reboot{loadedAt != null ? ` · ${pad2(uptimeMins)}m` : ""}</span>}
              icon={<ClockIcon />}
            />
          </div>
        </section>

        <section className="mt-9" aria-labelledby="modules-heading">
          <div className="mb-3.5 flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="modules-heading" className="flex items-center gap-2.5 font-display text-[13px] font-extrabold tracking-[0.08em] text-ink uppercase">
              Modules <span className="font-mono font-normal normal-case text-ink-muted">({modules.length})</span>
            </h2>
            <div className="font-mono text-[12px] text-ink-muted">
              Slots A1&ndash;A4 &middot; B1&ndash;B3 &middot; C1 &mdash; one shared I2C / analog / digital bus per slot
            </div>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(330px,1fr))] gap-3.5">
            {modules.map((m) => (
              <ModuleCard key={m.def.id} runtime={m} color={seriesColorFor(m.def.slug)} now={virtualNow} />
            ))}
          </div>
        </section>

        <AIInsights modules={modules} />

        <ActivityLog items={logItems} now={virtualNow} />

        <MarketplaceGrid plugins={marketplace} onInstall={handleInstall} onUninstall={handleUninstall} />

        <footer className="mt-11 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4.5 font-mono text-[11px] text-ink-muted">
          <span>Nodeframe &middot; MIT licensed</span>
          <span>snapshot {liveData.generated_at}</span>
        </footer>
      </div>
    </div>
  );
}
