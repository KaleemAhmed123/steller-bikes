'use client';

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
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          d="M12 20.7 4.3 13a4.6 4.6 0 0 1 6.5-6.5l1.2 1.2 1.2-1.2A4.6 4.6 0 0 1 19.7 13Z"
          fill={saved ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
      {variant === 'inline' && <span>{saved ? 'Saved' : 'Save'}</span>}
    </button>
  );
}
