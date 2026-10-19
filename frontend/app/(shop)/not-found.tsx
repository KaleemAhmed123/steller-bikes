import Link from 'next/link';

// Shown when a shop route calls notFound() — e.g. a product slug that doesn't
// exist. Renders inside the shop shell (header/footer), so it stays on-brand.
export default function ShopNotFound() {
  return (
    <div className="empty">
      <span className="empty-mark">🚲</span>
      We couldn’t find that page. It may have been moved or sold out.{' '}
      <Link href="/shop">Browse all bicycles →</Link>
    </div>
  );
}
