'use client';

import Link from 'next/link';
import { useCart } from './CartProvider';

// Header link to the cart, with a live item count badge.
export function CartButton() {
  const { cart } = useCart();
  const count = cart?.itemCount ?? 0;
  return (
    <Link href="/cart" className="cart-button">
      Cart
      {count > 0 && <span className="cart-count">{count}</span>}
    </Link>
  );
}
