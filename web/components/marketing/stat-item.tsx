export function StatItem({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-border pt-5">
      <span className="font-display text-3xl font-extrabold tabular-nums text-ink sm:text-4xl">
        {value}
      </span>
      <span className="font-mono text-[0.72rem] uppercase tracking-wider text-ink-muted">
        {label}
      </span>
    </div>
  );
}
