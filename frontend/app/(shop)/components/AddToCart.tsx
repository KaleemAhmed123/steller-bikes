'use client';

import { useState } from 'react';
import { useCart } from './CartProvider';
import { money } from '@/lib/api';

export interface PickVariant {
  variantId: string;
  size: string;
  color: string;
  price: number;
  compareAt: number;
  stock: number;
  lowStock: number;
}

// Variant picker + quantity + Add, on the product detail page.
//
// Honesty: each option is a REAL variant (a size+colour the catalogue actually
// has). We don't synthesise an independent colour×size matrix, so we never imply
// a combination exists that has no stock/SKU of its own. Out-of-stock variants
// are shown but disabled.
export function AddToCart({ variants }: { variants: PickVariant[] }) {
  const { add } = useCart();

  const firstAvailable = variants.find((v) => v.stock > 0) ?? variants[0];
  const [variantId, setVariantId] = useState(firstAvailable?.variantId ?? '');
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<'idle' | 'adding' | 'added' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const selected = variants.find((v) => v.variantId === variantId);
  const outOfStock = !selected || selected.stock <= 0;
  const max = selected?.stock ?? 0;
  const low = selected ? selected.stock > 0 && selected.stock <= selected.lowStock : false;
  const onSale = selected ? selected.compareAt > selected.price : false;

  async function onAdd() {
    if (!selected || outOfStock) return;
    setStatus('adding');
    setMessage('');
    try {
      await add(variantId, Math.min(quantity, max));
      setStatus('added');
    } catch (e) {
      setStatus('error');
      setMessage(e instanceof Error ? e.message : 'Could not add to cart.');
    }
  }

  return (
    <div className="rc-buy">
      <div className="rc-price rc-price--xl">
        {onSale && selected && <s className="rc-price-was">{money(selected.compareAt)}</s>}
        <span className="rc-price-now">{selected ? money(selected.price) : '—'}</span>
        {onSale && <span className="rc-chip-offer rc-chip-offer--inline">Sale</span>}
      </div>

      <div className="rc-options">
        <span className="rc-field-label">Choose an option</span>
        <div className="rc-option-grid" role="radiogroup" aria-label="Product options">
          {variants.map((v) => {
            const soldOut = v.stock <= 0;
            const active = v.variantId === variantId;
            return (
              <button
                key={v.variantId}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={soldOut}
                className={`rc-option ${active ? 'is-active' : ''} ${soldOut ? 'is-out' : ''}`}
                onClick={() => {
                  setVariantId(v.variantId);
                  setQuantity(1);
                  setStatus('idle');
                }}
              >
                <span className="rc-option-main">{v.size} · {v.color}</span>
                <span className="rc-option-price">{money(v.price)}{soldOut ? ' · sold out' : ''}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rc-buy-row">
        <div className="rc-qty" aria-label="Quantity">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={outOfStock || quantity <= 1}
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span>{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(max, q + 1))}
            disabled={outOfStock || quantity >= max}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>

        <button
          type="button"
          className="rc-btn rc-btn--ink rc-btn--block"
          onClick={onAdd}
          disabled={outOfStock || status === 'adding'}
        >
          {outOfStock ? 'Out of stock' : status === 'adding' ? 'Adding…' : 'Add to cart'}
        </button>
      </div>

      <div className="rc-stockline" aria-live="polite">
        {outOfStock && <span className="rc-stock rc-stock--out">● This option is out of stock</span>}
        {!outOfStock && low && <span className="rc-stock rc-stock--low">● Low stock — only {max} left</span>}
        {!outOfStock && !low && <span className="rc-stock rc-stock--ok">● In stock</span>}
      </div>

      {status === 'added' && <p className="rc-buy-feedback ok">Added to your cart ✓</p>}
      {status === 'error' && <p className="rc-buy-feedback err">{message}</p>}
    </div>
  );
}
