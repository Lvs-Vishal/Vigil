import { modulesInSlotOrder, seed, seriesColorFor } from "@/lib/data";

// Stylized hero visual: a rack of module bays matching the real slot groups
// (A1-A4, B1-B3, C1). This mirrors the live data honestly — four bays are
// seated with a real sensor (glowing, filled), four bays are open with a
// plugin manifest ready to seat (dimmer, dashed outline, "+"). The open bays
// aren't a gap to hide — they're the proof: the same slot format already
// works for sensors nobody has wired up yet.
export function ModuleRack() {
  const seated = modulesInSlotOrder();
  const open = seed.marketplace.filter((p) => !p.installed && p.target_slot);

  const bays = [
    ...seated.map((m) => ({
      kind: "seated" as const,
      slot: m.slot,
      color: seriesColorFor(m.slug),
      name: m.label,
    })),
    ...open.map((p) => ({
      kind: "open" as const,
      slot: p.target_slot as string,
      name: p.name,
    })),
  ].sort((a, b) => (a.slot < b.slot ? -1 : 1));

  return (
    <div
      className="rounded-lg border border-border bg-surface p-4"
      aria-label={`Nodeframe module rack: ${seated.length} bays seated with a live sensor module, ${open.length} bays open with a plugin ready to install`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[0.68rem] uppercase tracking-wider text-ink-muted">
          Core hub
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[0.68rem] text-teal">
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-teal" />
          online
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2.5">
        {bays.map((bay) =>
          bay.kind === "seated" ? (
            <div
              key={bay.slot}
              className="group relative flex aspect-square flex-col items-center justify-center gap-2 rounded-md border border-border bg-surface-2 transition-colors"
            >
              <span className="absolute left-1.5 top-1.5 font-mono text-[0.6rem] tracking-wide text-ink-muted">
                {bay.slot}
              </span>

              <span
                className="chip-glow h-3 w-3 rounded-[3px]"
                style={{ background: bay.color, boxShadow: `0 0 0 3px ${bay.color}22` }}
              />
              <span className="font-mono text-[0.55rem] uppercase tracking-wider text-ink-secondary">
                seated
              </span>
            </div>
          ) : (
            <div
              key={bay.slot}
              className="group relative flex aspect-square flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-transparent opacity-60 transition-colors"
            >
              <span className="absolute left-1.5 top-1.5 font-mono text-[0.6rem] tracking-wide text-ink-muted">
                {bay.slot}
              </span>

              <span className="flex h-3 w-3 items-center justify-center rounded-[3px] border border-dashed border-ink-muted font-mono text-[0.55rem] leading-none text-ink-muted">
                +
              </span>
              <span className="font-mono text-[0.55rem] uppercase tracking-wider text-ink-muted">
                open
              </span>
            </div>
          ),
        )}
      </div>

      <p className="mt-3 font-mono text-[0.72rem] leading-relaxed text-ink-muted">
        {seated.length} bays seated, {open.length} open — same slot, same
        bus. A plugin manifest already exists for every open bay.
      </p>

      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .chip-glow {
            animation: chip-pulse 2.6s ease-in-out infinite;
          }
          .live-dot {
            animation: chip-pulse 2.2s ease-in-out infinite;
          }
          @keyframes chip-pulse {
            0%, 100% { filter: brightness(1); opacity: 1; }
            50% { filter: brightness(1.35); opacity: 0.85; }
          }
        }
      `}</style>
    </div>
  );
}
