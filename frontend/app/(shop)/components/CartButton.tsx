'use client';

import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useCart } from './CartProvider';

// Header link to the cart, with a live item count badge.
export function CartButton() {
  const { cart } = useCart();
  const count = cart?.itemCount ?? 0;
  return (
    <Link href="/cart" className="cart-button">
      <ShoppingBag aria-hidden strokeWidth={1.75} />
      <span className="rc-nav-text">Cart</span>
      {count > 0 && <span className="cart-count">{count}</span>}
    </Link>
  );
}
