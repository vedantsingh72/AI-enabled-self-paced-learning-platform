/**
 * Single visible panel: tab strip + aria roles. Matches wellness-sage styling
 * used on counselling and course player flows.
 */
export default function SectionTabs({
  id,
  label,
  tabs,
  activeId,
  onChange,
  className = "",
}) {
  return (
    <div className={className}>
      <div
        className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
        role="tablist"
        aria-label={label}
        id={id}
      >
        {tabs.map((t) => {
          const active = activeId === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              id={`${id}-${t.id}`}
              aria-controls={`${id}-panel-${t.id}`}
              onClick={() => onChange(t.id)}
              className={`flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl border-2 px-4 py-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-wellness-sage focus-visible:ring-offset-2 focus-visible:ring-offset-wellness-cream sm:min-w-[9rem] sm:flex-none ${
                active
                  ? "border-wellness-sage bg-wellness-sage text-white shadow-md"
                  : "border-stone-200 bg-white text-slate-700 shadow-sm hover:border-wellness-sage/35 hover:bg-wellness-sage/10"
              }`}
            >
              <span>{t.label}</span>
              {typeof t.badge === "number" && t.badge > 0 ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-wellness-sage/15 text-wellness-sage ring-1 ring-wellness-sage/25"
                  }`}
                >
                  {t.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
