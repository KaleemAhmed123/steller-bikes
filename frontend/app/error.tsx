'use client';

import { useEffect } from 'react';
import Link from 'next/link';

// Root error boundary — catches a thrown render/data error anywhere below. Must
// be a client component (it holds the reset handler). Shows a calm message, a
// retry, and a way home, instead of Next's bare default screen.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface it for debugging; a real logger can hook in here later.
    console.error(error);
  }, [error]);

  return (
    <div className="page-fallback">
      <h1>Something went wrong</h1>
      <p className="muted">
        A hiccup on our side, not you. Try again — if it keeps happening, please contact us.
      </p>
      <div className="form-actions" style={{ justifyContent: 'center' }}>
        <button type="button" className="btn-primary" onClick={reset}>
          Try again
        </button>
        <Link href="/" className="btn-ghost">
          Go to the store
        </Link>
      </div>
    </div>
  );
}
