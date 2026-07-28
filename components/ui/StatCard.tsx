export function StatCard({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        accent
          ? "border-brand/35 bg-brand-soft"
          : "border-border bg-surface-elevated hover:border-border hover:bg-surface-hover"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
        {label}
      </p>
      <p
        className={`mt-2 font-display text-3xl font-semibold tracking-tight ${
          accent ? "text-brand" : "text-foreground"
        }`}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
    </div>
  );
}
