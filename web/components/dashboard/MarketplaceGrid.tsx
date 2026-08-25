import type { MarketplacePlugin } from "@/lib/data";
import { CheckIcon, PlusIcon } from "./icons";

function MarketCard({ plugin, onInstall, onUninstall }: { plugin: MarketplacePlugin; onInstall: (plugin: MarketplacePlugin) => void; onUninstall: (plugin: MarketplacePlugin) => void }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-surface px-4 py-3.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[14px] font-semibold text-ink">{plugin.name}</div>
          {plugin.sensor_chip && <div className="mt-0.5 font-mono text-[10.5px] text-ink-muted">{plugin.sensor_chip}</div>}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <span className="rounded-[3px] border border-border-strong px-1.5 py-0.5 font-mono text-[9px] tracking-[0.05em] text-ink-secondary uppercase">
          {plugin.category}
        </span>
      </div>
      <div className="flex-1 text-[12px] leading-[1.5] text-ink-secondary">{plugin.description}</div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5 font-mono text-[10.5px] text-ink-muted">
          <div>
            by <b className="font-medium text-ink-secondary">{plugin.author}</b>
          </div>
          <div>{plugin.installed ? "running now" : plugin.target_slot ? `would seat in slot ${plugin.target_slot}` : "no slot assigned yet"}</div>
        </div>
        {plugin.installed ? (
          <button
            type="button"
            onClick={() => onUninstall(plugin)}
            className="inline-flex items-center gap-1.5 rounded-md border border-critical/35 bg-critical/8 px-3 py-[7px] font-mono text-[11px] font-medium tracking-[0.03em] text-critical uppercase transition-colors hover:border-critical hover:bg-critical/20"
          >
            <span>Uninstall</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onInstall(plugin)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border-strong px-3 py-[7px] font-mono text-[11px] font-medium tracking-[0.03em] text-ink uppercase transition-colors hover:border-copper hover:bg-copper/8 hover:text-copper-strong"
          >
            <PlusIcon />
            <span>Install</span>
          </button>
        )}
      </div>
    </div>
  );
}

export function MarketplaceGrid({ plugins, onInstall, onUninstall }: { plugins: MarketplacePlugin[]; onInstall: (plugin: MarketplacePlugin) => void; onUninstall: (plugin: MarketplacePlugin) => void }) {
  return (
    <section className="mt-9">
      <div className="mb-3.5 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="flex items-center gap-2.5 font-display text-[13px] font-extrabold tracking-[0.08em] text-ink uppercase">
          Plugin Marketplace <span className="font-mono text-ink-muted font-normal normal-case">({plugins.length})</span>
        </h2>
        <div className="font-mono text-[12px] text-ink-muted">New sensor type = one manifest row, not a firmware rewrite</div>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
        {plugins.map((p) => (
          <MarketCard key={p.slug} plugin={p} onInstall={onInstall} onUninstall={onUninstall} />
        ))}
      </div>
    </section>
  );
}
