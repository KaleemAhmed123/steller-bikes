import Link from 'next/link';
import { Store, Phone, MapPin, User } from 'lucide-react';
import { getSettings } from '@/lib/api';
import { ToastProvider } from './components/ToastProvider';
import { CartProvider } from './components/CartProvider';
import { CartButton } from './components/CartButton';
import { AccountProvider } from './components/AccountProvider';
import { AccountNav } from './components/AccountNav';
import { WishlistProvider } from './components/WishlistProvider';
import { SavedNav } from './components/SavedNav';
import { RevealOnScroll } from './components/RevealOnScroll';
import { HeaderHeroWatch } from './components/HeaderHeroWatch';
import { Wordmark } from './components/Wordmark';

// Storefront shell: sticky header + shared cart/account/wishlist state +
// scroll-reveal + footer. Wraps every shop route.
export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const year = new Date().getFullYear();
  // Owner-set storefront banner ('' = hidden). getSettings never throws.
  const { announcement } = await getSettings();
  return (
    <ToastProvider>
      <AccountProvider>
        <CartProvider>
          <WishlistProvider>
          <a href="#main" className="skip-link">Skip to main content</a>
          <RevealOnScroll />
          <HeaderHeroWatch />
          {announcement && <div className="rc-announce">{announcement}</div>}
          <header className="rc-header">
            <div className="rc-header-inner container">
              <Link href="/" className="rc-brand" aria-label="Stellar Bikes — home">
                <Wordmark />
              </Link>
              <nav className="rc-nav" aria-label="Primary">
                <Link href="/shop" className="rc-nav-link"><Store aria-hidden strokeWidth={1.75} /><span className="rc-nav-text">Shop</span></Link>
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
                <h2>Shop</h2>
                <Link href="/shop">All bicycles</Link>
                <Link href="/shop?category=Mountain">Mountain</Link>
                <Link href="/shop?category=City">City</Link>
                <Link href="/shop?category=Kids">Kids</Link>
                <Link href="/shop?category=Accessories">Accessories</Link>
              </nav>

              <div className="rc-footer-col">
                <h2>Store</h2>
                <span className="rc-contact"><MapPin aria-hidden strokeWidth={1.75} />Kanpur, Uttar Pradesh</span>
                <span>Cash on delivery</span>
                <span>Saleem</span>
                <a href="tel:+918090109621" className="rc-contact"><Phone aria-hidden strokeWidth={1.75} />+91 80901 09621</a>
                <Link href="/account" className="rc-contact"><User aria-hidden strokeWidth={1.75} />Your account</Link>
              </div>
            </div>

            <div className="container rc-footer-base">
              <span>© {year} Stellar Bikes · stellarbikes.in</span>
            </div>
          </footer>
          </WishlistProvider>
        </CartProvider>
      </AccountProvider>
    </ToastProvider>
  );
}
