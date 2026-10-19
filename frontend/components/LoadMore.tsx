'use client';

import { useEffect, useRef } from 'react';

// One trigger used everywhere: an IntersectionObserver sentinel that calls
// onLoadMore when it scrolls near the viewport, PLUS an always-rendered "Load more"
// button. The button is the accessible / reduced-motion / no-observer fallback and
// the primary control for dense admin tables (pass auto={false} there).
//
// The count line is an aria-live="polite" region so a screen reader announces how
// many items are shown after each page appends.

interface Props {
  onLoadMore: () => void;
  hasMore: boolean;
  loading: boolean;
  count: number; // items currently shown
  total?: number; // total available (for the announced count)
  label?: string; // plural noun, e.g. "bikes", "orders"
  error?: string;
  auto?: boolean; // observe a sentinel (default true); false = button only
}

export function LoadMore({
  onLoadMore,
  hasMore,
  loading,
  count,
  total,
  label = 'items',
  error,
  auto = true,
}: Props) {
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!auto || !hasMore || loading || error) return;
    const el = sentinel.current;
    if (!el) return;
    // Reduced motion → no auto-advance; the person uses the button.
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    if (typeof IntersectionObserver === 'undefined') return; // old browser → button only
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { rootMargin: '400px' }, // start loading a bit before it's actually seen
    );
    io.observe(el);
    return () => io.disconnect();
  }, [auto, hasMore, loading, error, onLoadMore]);

  return (
    <div className="load-more">
      <p className="load-more-count" aria-live="polite">
        {total != null ? `Showing ${count} of ${total} ${label}` : `Showing ${count} ${label}`}
      </p>

      {error && <p className="notice error load-more-error">{error}</p>}

      {hasMore ? (
        <>
          {auto && !error && <div ref={sentinel} aria-hidden="true" className="load-more-sentinel" />}
          <button type="button" className="btn-ghost load-more-btn" onClick={onLoadMore} disabled={loading}>
            {loading ? 'Loading…' : error ? 'Retry' : 'Load more'}
          </button>
        </>
      ) : (
        count > 0 && <p className="muted load-more-end">That’s everything.</p>
      )}
    </div>
  );
}
