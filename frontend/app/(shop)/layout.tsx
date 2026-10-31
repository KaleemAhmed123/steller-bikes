import Link from 'next/link';
import { Store, Phone, MapPin, User } from 'lucide-react';
import { getSettings, moneyShort } from '@/lib/api';
import { ToastProvider } from './components/ToastProvider';
import { CartProvider } from './components/CartProvider';
import { CartButton } from './components/CartButton';
import { AccountProvider } from './components/AccountProvider';
import { AccountNav } from './components/AccountNav';
import { WishlistProvider } from './components/WishlistProvider';
import { SavedNav } from './components/SavedNav';
import { RevealOnScroll } from './components/RevealOnScroll';
import { Wordmark } from './components/Wordmark';
import { PromoStrip } from '@/components/promo-strip/PromoStrip';
import { telHref } from '@/lib/contact';
import { paymentLabel } from '@/lib/payment';

// Storefront shell: sticky header + shared cart/account/wishlist state +
// scroll-reveal + footer. Wraps every shop route.
export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const year = new Date().getFullYear();
  // Owner-set promo strip ('' text = hidden), set under Admin → Promo strip. getSettings never throws.
  const settings = await getSettings();
  const { announcement, announcementStyle, countdownEndsAt, kanpurDeliveryFee, contactName, contactPhone } = settings;
  return (
    <ToastProvider>
      <AccountProvider>
        <CartProvider>
          <WishlistProvider>
          <a href="#main" className="skip-link">Skip to main content</a>
          <RevealOnScroll />
          {announcement && <PromoStrip styleId={announcementStyle} text={announcement} countdownEndsAt={countdownEndsAt} />}
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
                <span>{paymentLabel(settings)}</span>
                <span>
                  Kanpur: flat {kanpurDeliveryFee > 0 ? moneyShort(kanpurDeliveryFee) : 'free'} Fitted Delivery
                </span>
                <span>Elsewhere: Delhivery — our agent calls to confirm your order</span>
                {contactPhone && (
                  <>
                    <span>{contactName}</span>
                    <a href={telHref(contactPhone)} className="rc-contact"><Phone aria-hidden strokeWidth={1.75} />{contactPhone}</a>
                  </>
                )}
                <Link href="/account" className="rc-contact"><User aria-hidden strokeWidth={1.75} />Your account</Link>
                <Link href="/about">About us</Link>
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
