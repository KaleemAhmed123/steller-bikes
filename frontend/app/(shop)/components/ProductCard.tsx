'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { SafeImage } from '@/components/SafeImage';
import { money } from '@/lib/api';
import type { CardProduct } from '@/lib/catalogue';
import { useCart } from './CartProvider';
import { useToast } from './ToastProvider';
import { WishlistButton } from './WishlistButton';
import { OfferTags } from './OfferTags';

// Best-effort colour-name → swatch colour. Preview only — selecting a real
// colour happens on the detail page, never here (cards aren't config forms).
function swatch(name: string): string {
  const n = name.toLowerCase();
  const pairs: [string, string][] = [
    ['black', '#1b1d22'], ['white', '#f1f1ee'], ['graphite', '#5b616b'], ['silver', '#c3c7cd'],
    ['grey', '#8a9099'], ['gray', '#8a9099'], ['navy', '#1f2b5e'], ['blue', '#2b4cff'],
    ['teal', '#17b0a0'], ['mint', '#8fe3cf'], ['green', '#2f8b57'], ['red', '#e23b2e'],
    ['orange', '#ff7a1a'], ['yellow', '#f5c518'], ['pink', '#ff7aa2'], ['cream', '#ece2c9'],
  ];
  for (const [k, v] of pairs) if (n.includes(k)) return v;
  return '#9aa0a8';
}

export function ProductCard({ card, tone = 'light' }: { card: CardProduct; tone?: 'light' | 'dark' }) {
  const { add } = useCart();
  const { show } = useToast();
  const [adding, setAdding] = useState(false);
  const multi = card.variantCount > 1;
  const soldOut = !card.inStock;

  async function quickAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!card.soleVariantId || soldOut) return;
    setAdding(true);
    try {
      await add(card.soleVariantId, 1); // global toast confirms success
    } catch (err) {
      show(err instanceof Error ? err.message : 'Could not add to cart.', 'error');
    } finally {
      setAdding(false);
    }
  }

  return (
    <Link href={`/p/${card.slug}`} className={`rc-card rc-card--${tone}`}>
      <div className="rc-card-media">
        <SafeImage
          src={card.image}
          alt={`${card.name} — illustrative sample photo`}
          fill
          sizes="(max-width: 700px) 50vw, (max-width: 1100px) 33vw, 320px"
        />
        <span className="rc-chip-sample">SAMPLE</span>
        {card.hasOffer && card.offerPct > 0 && <span className="rc-chip-offer">-{card.offerPct}%</span>}
        {soldOut && <span className="rc-card-soldout">Out of stock</span>}
        <WishlistButton slug={card.slug} name={card.name} />
      </div>

      <OfferTags types={card.offerTypes} max={3} />

      <div className="rc-card-body">
        <span className="rc-card-cat">{card.category}</span>
        <h3 className="rc-card-name">{card.name}</h3>

        {card.colors.length > 0 && (
          <span className="rc-swatches" aria-label={`Colours: ${card.colors.join(', ')}`}>
            {card.colors.slice(0, 4).map((c) => (
              <i key={c} style={{ background: swatch(c) }} title={c} />
            ))}
            {card.colors.length > 4 && <em>+{card.colors.length - 4}</em>}
          </span>
        )}

        <div className="rc-card-foot">
          <span className="rc-price">
            {multi && <span className="rc-price-from">from</span>}
            {card.fromCompareAt > 0 && <s className="rc-price-was">{money(card.fromCompareAt)}</s>}
            <span className="rc-price-now">{money(card.fromPrice)}</span>
          </span>

          {soldOut ? (
            <span className="rc-card-action is-disabled" aria-disabled="true">Sold out</span>
          ) : multi ? (
            <span className="rc-card-action">Choose options</span>
          ) : (
            <button type="button" className="rc-card-add" onClick={quickAdd} disabled={adding}>
              {adding ? 'Adding…' : (<><Plus size={15} strokeWidth={2} aria-hidden />Add</>)}
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
