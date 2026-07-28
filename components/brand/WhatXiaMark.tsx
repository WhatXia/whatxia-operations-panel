export function WhatXiaMark({
  size = "md",
  showWordmark = true,
}: {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
}) {
  const box =
    size === "lg" ? "h-11 w-11" : size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const text =
    size === "lg" ? "text-xl" : size === "sm" ? "text-sm" : "text-base";

  return (
    <div className="flex items-center gap-3">
      <div
        className={`relative flex ${box} items-center justify-center rounded-lg bg-brand text-brand-ink shadow-[0_0_0_1px_rgba(245,197,24,0.35)]`}
        aria-hidden
      >
        <span className="font-display text-lg font-bold leading-none">W</span>
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-foreground ring-2 ring-surface" />
      </div>
      {showWordmark ? (
        <div className="min-w-0">
          <p className={`font-display font-semibold tracking-tight text-foreground ${text}`}>
            WhatXia
          </p>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
            Operations Center
          </p>
        </div>
      ) : null}
    </div>
  );
}
