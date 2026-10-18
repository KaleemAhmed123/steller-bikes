import Link from 'next/link';
import { CartProvider } from './components/CartProvider';
import { CartButton } from './components/CartButton';
import { AccountProvider } from './components/AccountProvider';
import { AccountNav } from './components/AccountNav';
import { WishlistProvider } from './components/WishlistProvider';
import { SavedNav } from './components/SavedNav';
import { RevealOnScroll } from './components/RevealOnScroll';
import { Wordmark } from './components/Wordmark';

// Storefront shell: sticky header + shared cart/account/wishlist state +
// scroll-reveal + footer. Wraps every shop route.
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const year = new Date().getFullYear();
  return (
    <AccountProvider>
      <CartProvider>
        <WishlistProvider>
          <RevealOnScroll />
          <header className="rc-header">
            <div className="rc-header-inner container">
              <Link href="/" className="rc-brand" aria-label="Raju Cycles — home">
                <Wordmark />
              </Link>
              <nav className="rc-nav" aria-label="Primary">
                <Link href="/shop" className="rc-nav-link">Shop</Link>
                <SavedNav />
                <AccountNav />
                <CartButton />
              </nav>
            </div>
          </header>

          <main id="main">{children}</main>

          <footer className="rc-footer">
            <div className="container rc-footer-inner">
              <div className="rc-footer-brand">
                <Wordmark />
                <p className="rc-footer-tag">Affordable bicycles in Kanpur — built for the everyday ride.</p>
              </div>

              <nav className="rc-footer-col" aria-label="Shop">
                <h4>Shop</h4>
                <Link href="/shop">All bicycles</Link>
                <Link href="/shop?category=Mountain">Mountain</Link>
                <Link href="/shop?category=City">City</Link>
                <Link href="/shop?category=Kids">Kids</Link>
                <Link href="/shop?category=Accessories">Accessories</Link>
              </nav>

              <div className="rc-footer-col">
                <h4>Store</h4>
                <span>Kanpur, Uttar Pradesh</span>
                <span>Cash on delivery</span>
                <span className="rc-footer-muted">Phone &amp; address coming soon</span>
                <Link href="/account">Your account</Link>
              </div>
            </div>

            <div className="container rc-footer-base">
              <span>© {year} Raju Cycles</span>
              <span className="rc-footer-credit">
                Hero 3D model “Bicycle” by Poly&nbsp;by&nbsp;Google, licensed{' '}
                <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">CC-BY&nbsp;3.0</a>,
                via <a href="https://poly.pizza/m/19VoUuA2pcN" target="_blank" rel="noreferrer">Poly&nbsp;Pizza</a>.
              </span>
            </div>
          </footer>
        </WishlistProvider>
      </CartProvider>
    </AccountProvider>
  );
}
