'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useWishlist } from './WishlistProvider';

// Header link to the wishlist, with a live saved-count badge.
export function SavedNav() {
  const { count, ready } = useWishlist();
  return (
    <Link href="/saved" className="rc-nav-link">
      <Heart aria-hidden strokeWidth={1.75} />
      <span className="rc-nav-text">Saved</span>
      {ready && count > 0 && <span className="rc-nav-badge">{count}</span>}
    </Link>
  );
}
