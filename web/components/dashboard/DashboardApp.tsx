"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MarketplacePlugin, SeedData } from "@/lib/data";
import { computeStats, fmtNumber, modulesInSlotOrder, seriesColorFor, uptimeLabel } from "@/lib/data";
import { ActivityLog } from "./ActivityLog";
import { AIInsights } from "./AIInsights";
import { AlertIcon, ClockIcon, ModulesIcon, PulseIcon } from "./icons";
import { MarketplaceGrid } from "./MarketplaceGrid";
import { ModuleCard } from "./ModuleCard";
import { StatTile } from "./StatTile";
import { TopBar } from "./TopBar";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";
import { buildMergedLog, overallStatus, tickModules } from "./utils";
import type { LogItem, ModuleRuntime } from "./utils";

const DATA_TICK_MS = 3600;
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
  const router = useRouter();
  const reduceMotion = usePrefersReducedMotion();

  const [modules, setModules] = useState<ModuleRuntime[]>(() => initModules(initialData));
  const [logItems, setLogItems] = useState<LogItem[]>(() => buildMergedLog(initialData.events, initialData.modules));
  const [marketOverrides, setMarketOverrides] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setModules(initModules(initialData));
    setLogItems(buildMergedLog(initialData.events, initialData.modules));
  }, [initialData]);

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
    }, 15000);
    return () => clearInterval(id);
  }, [router]);

  // `loadedAt`/`nowMs` stay null through the server render and the first
  // client render, so the virtual clock renders as the seed's fixed
  // `generated_at` timestamp on both — no hydration mismatch. An effect
  // then stamps the real load time once mounted, and (unless the user
  // prefers reduced motion) a 1s interval keeps it advancing from there.
  const [loadedAt, setLoadedAt] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState<number | null>(null);
  const seedNowMs = useMemo(() => new Date(initialData.generated_at).getTime(), [initialData.generated_at]);

  useEffect(() => {
    // One-time capture of the real load timestamp. This intentionally can't
    // be a lazy useState initializer or a useSyncExternalStore snapshot:
    // Date.now() must differ between the server render and this first
    // client effect for the virtual clock to be meaningful, and capturing
    // it via an initializer would make the server-rendered HTML and the
    // first client render disagree, causing a hydration mismatch. Staying
    // null through both of those renders keeps them identical; this effect
    // then supplies the real value once mounted.
    const t = Date.now();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadedAt(t);
    setNowMs(t);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const clockId = setInterval(() => setNowMs(Date.now()), CLOCK_TICK_MS);
    const dataId = setInterval(() => setModules((prev) => tickModules(prev)), DATA_TICK_MS);
    return () => {
      clearInterval(clockId);
      clearInterval(dataId);
    };
  }, [reduceMotion]);

  const elapsedMs = reduceMotion || loadedAt == null ? 0 : (nowMs ?? loadedAt) - loadedAt;
  const virtualNow = useMemo(() => new Date(seedNowMs + elapsedMs), [seedNowMs, elapsedMs]);

  const stats = useMemo(() => computeStats(initialData), [initialData]);

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

  const elapsedHrs = elapsedMs / 3600000;
  const uptimeHours = initialData.core.uptime_hours + elapsedHrs;
  const uptimeDays = Math.floor(uptimeHours / 24);
  const uptimeHrs = Math.floor(uptimeHours % 24);
  const uptimeMins = Math.floor((uptimeHours * 60) % 60);
  const uptimeValue = loadedAt == null ? uptimeLabel(initialData.core.uptime_hours) : `${uptimeDays}d ${uptimeHrs}h`;

  const marketplace: MarketplacePlugin[] = useMemo(
    () => initialData.marketplace.map((p) => (marketOverrides.has(p.slug) ? { ...p, installed: true } : p)),
    [initialData.marketplace, marketOverrides],
  );

  function handleInstall(plugin: MarketplacePlugin) {
    setMarketOverrides((prev) => {
      const next = new Set(prev);
      next.add(plugin.slug);
      return next;
    });
    setLogItems((prev) => [
      {
        t: virtualNow.toISOString(),
        severity: "info",
        module: plugin.name,
        type: "plugin",
        message: `Plugin '${plugin.name}' (${plugin.slug}) installed — seated in slot ${plugin.target_slot ?? "unassigned"}.`,
      },
      ...prev,
    ]);
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <TopBar
        now={virtualNow}
        hubName={initialData.core.name}
        firmware={initialData.core.firmware}
        slotsUsed={initialData.core.slots_used}
        slotsTotal={initialData.core.slots_total}
        overallStatus={overall}
        reduceMotion={reduceMotion}
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

        <AIInsights />

        <ActivityLog items={logItems} now={virtualNow} />

        <MarketplaceGrid plugins={marketplace} onInstall={handleInstall} />

        <footer className="mt-11 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4.5 font-mono text-[11px] text-ink-muted">
          <span>Nodeframe &middot; MIT licensed</span>
          <span>snapshot {initialData.generated_at}</span>
        </footer>
      </div>
    </div>
  );
}
