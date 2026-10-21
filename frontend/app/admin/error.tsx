'use client';

import { useEffect } from 'react';
import { RotateCcw } from 'lucide-react';

// Segment boundary for the admin. Renders inside the admin shell (sidebar stays),
// so a crash in one admin page doesn't blank the whole back-office.
export default function AdminError({
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
    <div>
      <h1 className="admin-h1">Something broke on this screen</h1>
      <div className="notice error">
        A hiccup loading this admin page. The rest of the admin is unaffected.
      </div>
      <div className="admin-actions">
        <button type="button" className="btn-primary" onClick={reset}>
          <RotateCcw aria-hidden strokeWidth={1.75} />
          Try again
        </button>
      </div>
    </div>
  );
}
