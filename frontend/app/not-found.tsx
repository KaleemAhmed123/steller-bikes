import Link from 'next/link';

// Root 404 — shown for any URL that matches no route (outside the shop shell,
// so this one carries its own minimal chrome). Self-contained and centered.
export default function NotFound() {
  return (
    <div className="page-fallback">
      <h1>Page not found</h1>
      <p className="muted">The page you’re looking for doesn’t exist or has moved.</p>
      <Link href="/" className="btn-primary">
        Go to the store
      </Link>
    </div>
  );
}
