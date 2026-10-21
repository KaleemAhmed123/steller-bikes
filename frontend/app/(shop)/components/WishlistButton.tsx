'use client';

import { Heart } from 'lucide-react';
import { useWishlist } from './WishlistProvider';

// Accessible heart toggle. `variant` only changes styling (floating on a card
// vs inline on the detail page). Always a real button with a clear label.
export function WishlistButton({ slug, name, variant = 'card' }: { slug: string; name: string; variant?: 'card' | 'inline' }) {
  const { has, toggle, ready } = useWishlist();
  const saved = ready && has(slug);

  return (
    <button
      type="button"
      className={`rc-wish rc-wish--${variant} ${saved ? 'is-saved' : ''}`}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from wishlist` : `Save ${name} to wishlist`}
      title={saved ? 'Saved' : 'Save to wishlist'}
      onClick={(e) => {
        // On a card the whole tile is a link — don't navigate when saving.
        e.preventDefault();
        e.stopPropagation();
        toggle(slug);
      }}
    >
      <Heart size={18} strokeWidth={1.8} fill={saved ? 'currentColor' : 'none'} aria-hidden />
      {variant === 'inline' && <span>{saved ? 'Saved' : 'Save'}</span>}
    </button>
  );
}
