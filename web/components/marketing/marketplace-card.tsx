import type { MarketplacePlugin } from "@/lib/data";

export function MarketplaceCard({ plugin }: { plugin: MarketplacePlugin }) {
  return (
    <div
      className={`flex flex-col gap-2.5 rounded-lg border bg-surface p-4 ${
        plugin.installed ? "border-border-strong" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-display text-base font-bold text-ink">
          {plugin.name}
        </span>
        <span
          className={`shrink-0 whitespace-nowrap rounded px-2 py-1 font-mono text-[0.62rem] uppercase tracking-wide ${
            plugin.installed
              ? "bg-teal/15 text-teal"
              : "border border-border-strong text-ink-secondary"
          }`}
        >
          {plugin.installed ? "installed" : "not installed"}
        </span>
      </div>

      {plugin.sensor_chip && (
        <span className="font-mono text-xs text-ink-muted">{plugin.sensor_chip}</span>
      )}

      <p className="flex-1 text-[0.82rem] leading-relaxed text-ink-secondary">
        {plugin.description}
      </p>

      <div className="mt-0.5 flex items-center justify-between border-t border-border pt-2.5">
        <span className="font-mono text-[0.68rem] text-ink-muted">{plugin.category}</span>
        {plugin.installed ? (
          <span className="font-mono text-[0.68rem] text-teal">installed</span>
        ) : (
          <span className="flex items-center gap-2 font-mono text-[0.68rem]">
            {plugin.target_slot && (
              <span className="text-ink-muted">→ slot {plugin.target_slot}</span>
            )}
            <span className="text-copper-strong">Install</span>
          </span>
        )}
      </div>
    </div>
  );
}
