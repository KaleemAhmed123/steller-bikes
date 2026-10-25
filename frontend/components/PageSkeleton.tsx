// Shimmering placeholder blocks for a page (or panel) whose data is still loading —
// used instead of a bare "Loading…" so the layout does not jump when content arrives.
export function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="page-skeleton" role="status" aria-label="Loading">
      <div className="skeleton skeleton-line" style={{ width: 200, height: 26, marginBottom: 18 }} />
      {Array.from({ length: rows }).map((_, i) => (
        <div className="skeleton" key={i} style={{ height: 84, borderRadius: 12, marginBottom: 14 }} />
      ))}
      <span className="rc-sr-only">Loading…</span>
    </div>
  );
}
