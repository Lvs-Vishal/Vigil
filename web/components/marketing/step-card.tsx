export function StepCard({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: string;
}) {
  return (
    <div className="flex flex-col gap-3 bg-surface p-7">
      <span className="font-mono text-sm text-copper">
        {String(index).padStart(2, "0")}
      </span>
      <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
      <p className="text-sm leading-relaxed text-ink-secondary">{children}</p>
    </div>
  );
}
