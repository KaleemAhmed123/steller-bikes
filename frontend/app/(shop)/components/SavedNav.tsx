'use client';

import Link from 'next/link';
import { useWishlist } from './WishlistProvider';

// Header link to the wishlist, with a live saved-count badge.
export function SavedNav() {
  const { count, ready } = useWishlist();
  return (
    <Link href="/saved" className="rc-nav-link">
      Saved
      {ready && count > 0 && <span className="rc-nav-badge">{count}</span>}
    </Link>
  );
}
