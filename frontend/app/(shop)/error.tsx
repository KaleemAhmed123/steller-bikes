'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { RotateCcw } from 'lucide-react';

// Segment boundary for the storefront. A crash in a shop page renders here —
// inside the shop shell (header/footer stay), so the failure is contained to the
// content area and the rest of the site keeps working.
export default function ShopError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="page-fallback">
      <h1>This page hit a snag</h1>
      <p className="muted">
        Something failed while loading this part of the store. The rest of the site is fine.
      </p>
      <div className="form-actions" style={{ justifyContent: 'center' }}>
        <button type="button" className="btn-primary" onClick={reset}>
          <RotateCcw aria-hidden strokeWidth={1.75} />
          Try again
        </button>
        <Link href="/shop" className="btn-ghost">
          Browse bicycles
        </Link>
      </div>
    </div>
  );
}
