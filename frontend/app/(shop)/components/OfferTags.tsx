import Link from 'next/link';
import { offerLabel } from '@/lib/offers';

// Small offer pills ("Diwali", "New Year") for a product.
//  - `max` caps the row (product card: 3); the overflow collapses into a "…" pill
//    whose tooltip lists the rest.
//  - `linked` turns each pill into a link to the filtered shop (product page). On a
//    card the whole card is already a link, so there the pills are plain text.
export function OfferTags({ types, max, linked = false }: { types: string[]; max?: number; linked?: boolean }) {
  if (types.length === 0) return null;
  const shown = max ? types.slice(0, max) : types;
  const hidden = max ? types.slice(max) : [];

  return (
    <ul className={`rc-offer-tags ${max ? 'is-capped' : ''}`} aria-label="Offers">
      {shown.map((t) => (
        <li key={t}>
          {linked ? (
            <Link href={`/shop?offerType=${encodeURIComponent(t)}`} className="rc-offer-tag">
              {offerLabel(t)}
            </Link>
          ) : (
            <span className="rc-offer-tag">{offerLabel(t)}</span>
          )}
        </li>
      ))}
      {hidden.length > 0 && (
        <li>
          <span
            className="rc-offer-tag rc-offer-tag--more"
            title={hidden.map(offerLabel).join(', ')}
            aria-label={`Also: ${hidden.map(offerLabel).join(', ')}`}
          >
            …
          </span>
        </li>
      )}
    </ul>
  );
}
