'use client';

import { useEffect } from 'react';

// Last-resort boundary: catches a crash in the ROOT layout itself — the one case
// app/error.tsx can't, because that renders *inside* the root layout. It must
// supply its own <html>/<body> and can't rely on globals.css (the layout that
// imports it is what failed), so styles are inlined.
export default function GlobalError({
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
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: '#faf9f5',
          color: '#16191b',
        }}
      >
        <div style={{ textAlign: 'center', padding: 40, maxWidth: 460 }}>
          <h1 style={{ fontSize: 24, margin: '0 0 8px' }}>Something went wrong</h1>
          <p style={{ color: '#6b7069', margin: '0 0 20px', lineHeight: 1.6 }}>
            A hiccup on our side, not you. Please try again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              border: 'none',
              borderRadius: 999,
              padding: '10px 20px',
              fontSize: 15,
              fontWeight: 600,
              background: '#16191b',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
