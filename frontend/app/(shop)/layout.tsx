import Link from 'next/link';
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
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const year = new Date().getFullYear();
  return (
    <AccountProvider>
      <CartProvider>
        <WishlistProvider>
          <RevealOnScroll />
          <HeaderHeroWatch />
          {/* Set the dark over-hero header before first paint on the homepage,
              so the light header never flashes at the top. The observer takes
              over for scroll updates. */}
          <script
            dangerouslySetInnerHTML={{
              __html:
                "if(location.pathname==='/'){document.body.setAttribute('data-over-hero','true')}",
            }}
          />
          <header className="rc-header">
            <div className="rc-header-inner container">
              <Link href="/" className="rc-brand" aria-label="Stellar Bikes — home">
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
                <span>Saleem</span>
                <a href="tel:+918090109621">+91 80901 09621</a>
                <Link href="/account">Your account</Link>
              </div>
            </div>

            <div className="container rc-footer-base">
              <span>© {year} Stellar Bikes · stellarbikes.in</span>
            </div>
          </footer>
        </WishlistProvider>
      </CartProvider>
    </AccountProvider>
  );
}
