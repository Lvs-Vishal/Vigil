// Small bracket/slot wordmark icon shared by the nav and footer.
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="2.5"
        y="2.5"
        width="19"
        height="19"
        rx="4"
        stroke="var(--copper)"
        strokeWidth="1.5"
      />
      <rect
        x="7.5"
        y="7.5"
        width="9"
        height="9"
        rx="2"
        stroke="var(--teal)"
        strokeWidth="1.3"
      />
      <circle cx="2.5" cy="2.5" r="1.4" fill="var(--copper)" />
    </svg>
  );
}
