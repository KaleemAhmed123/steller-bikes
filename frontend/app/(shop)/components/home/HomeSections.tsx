import Link from 'next/link';
import { safeSrc } from '@/lib/img';
import type { CSSProperties } from 'react';
import { money } from '@/lib/api';
import type { StoreSettings } from '@/lib/types';
import type { CardProduct, CatTile, HomeData } from '@/lib/catalogue';
import { ProductCard } from '../ProductCard';
import { SectionHead } from './HomeRail';
import { RailCarousel } from './RailCarousel';

// --- Product carousels -------------------------------------------------------
// The expanded product rails, restored to the homepage as real carousels
// (arrows + dots). Placed below the two 3D moments so 3D stays the star.
// Offers/Kids self-guard on empty inside RailCarousel.

// Editorial direction: off-white bands, one ink accent (no saturated colour).
// Section backgrounds are set by the rc-section--* classes in redesign.css.
const GOLD = '#0c0a09'; // ink accent (kept the name to avoid churn across call-sites)

export function HomeCarousels({ data }: { data: HomeData }) {
  return (
    <>
      <RailCarousel
        section="rc-section--mint"
        eyebrow="Fresh off the stand"
        title="New arrivals"
        blurb="The newest sample bikes, newest first."
        cards={data.newArrivals}
        href="/collections/new-arrivals"
        accent={GOLD}
      />
      <RailCarousel
        section="rc-section--lilac"
        eyebrow="Hand-picked by us"
        title="Staff picks"
        blurb="An editorial selection across the range — not a popularity ranking."
        cards={data.featured}
        href="/collections/staff-picks"
        accent={GOLD}
      />
      <RailCarousel
        section="rc-section--offer"
        eyebrow="Genuine markdowns"
        title="On offer now"
        blurb="Only real sample discounts — the crossed-out price is the variant's own compareAt."
        cards={data.offers}
        href="/collections/offers"
        accent={GOLD}
      />
      <RailCarousel
        section="rc-section--kids"
        eyebrow="For the whole family"
        title="Kids & family"
        blurb="Smaller frames, lighter builds, first-ride friendly."
        cards={data.kids}
        href="/shop?category=Kids"
        accent={GOLD}
      />
    </>
  );
}

// --- Category explorer -------------------------------------------------------
// Distinct-from-a-grid: big tappable tiles, one per real category, each with its
// own accent so the page doesn't read as one repeated template.

const CAT_ACCENT: Record<string, string> = {
  Mountain: '#0c0a09',
  City: '#0c0a09',
  Road: '#0c0a09',
  Kids: '#0c0a09',
  Accessories: '#0c0a09',
};

export function CategoryExplorer({ tiles }: { tiles: CatTile[] }) {
  if (tiles.length === 0) return null;
  return (
    <section className="rc-section rc-section--light" data-reveal>
      <div className="container">
        <SectionHead
          eyebrow="Find your ride"
          title="Shop by category"
          blurb="Every bike here is clearly-labelled sample data while the real catalogue is loaded."
        />
        <div className="rc-cats">
          {tiles.map((t) => (
            <Link
              key={t.name}
              href={`/shop?category=${encodeURIComponent(t.name)}`}
              className="rc-cat"
              style={{ '--rc-accent': CAT_ACCENT[t.name] ?? '#c0974a' } as CSSProperties}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={safeSrc(t.image)} alt="" aria-hidden="true" loading="lazy" />
              <div className="rc-cat-body">
                <span className="rc-cat-count">{t.count} {t.count === 1 ? 'model' : 'models'}</span>
                <h3>{t.name}</h3>
                <span className="rc-cat-go" aria-hidden="true">Explore →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- Editorial feature (New Arrivals lead) -----------------------------------
// The single newest product, blown up. "Just in" = newest by createdAt (honest).

export function EditorialFeature({ card }: { card: CardProduct }) {
  return (
    <section className="rc-section rc-section--paper" data-reveal>
      <div className="container">
        <div className="rc-feature">
          <Link href={`/p/${card.slug}`} className="rc-feature-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={safeSrc(card.image)} alt={`${card.name} — illustrative sample photo`} loading="lazy" />
            <span className="rc-chip-sample">SAMPLE</span>
          </Link>
          <div className="rc-feature-copy">
            <span className="rc-eyebrow" style={{ '--rc-accent': '#c6f24e' } as CSSProperties}>
              Just in · newest in the catalogue
            </span>
            <h2 className="rc-feature-title">{card.name}</h2>
            <p className="rc-sec-blurb">
              The latest sample arrival in our {card.category.toLowerCase()} range. Configure colour
              and size on the product page.
            </p>
            <p className="rc-price rc-price--lg">
              {card.variantCount > 1 && <span className="rc-price-from">from</span>}
              <span className="rc-price-now">{money(card.fromPrice)}</span>
            </p>
            <Link href={`/p/${card.slug}`} className="rc-btn rc-btn--ink">
              View the {card.name} →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// --- Offers band -------------------------------------------------------------
// Only rendered when real compareAt discounts exist (homepage guards on length).

export function OfferBand({ cards }: { cards: CardProduct[] }) {
  if (cards.length === 0) return null;
  return (
    <section className="rc-section rc-section--offer" data-reveal>
      <div className="container">
        <SectionHead
          eyebrow="Genuine markdowns"
          title="On offer now"
          blurb="Every price here is a real sample discount — the crossed-out price is the variant's own compareAt."
          href="/shop?sort=price-asc"
          hrefLabel="Shop deals"
          tone="dark"
          accent="#ffffff"
        />
        <div className="rc-rail" role="list">
          {cards.map((c) => (
            <div className="rc-rail-item" role="listitem" key={c.slug}>
              <ProductCard card={c} tone="dark" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- Kids & family -----------------------------------------------------------

export function KidsBlock({ cards }: { cards: CardProduct[] }) {
  if (cards.length === 0) return null;
  return (
    <section className="rc-section rc-section--kids" data-reveal>
      <div className="container">
        <SectionHead
          eyebrow="For the whole family"
          title="Kids & family"
          blurb="Smaller frames, lighter builds, first-ride friendly."
          href="/shop?category=Kids"
          accent="#0c6b60"
        />
        <div className="rc-rail" role="list">
          {cards.map((c) => (
            <div className="rc-rail-item" role="listitem" key={c.slug}>
              <ProductCard card={c} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- Showroom / honest store info --------------------------------------------
// Reads real shop details from store settings when present; any blank field
// keeps its honest "coming soon" placeholder. No invented data.

// Build the address line from whatever parts are filled (blank parts dropped).
function addressLine(s?: StoreSettings): string {
  if (!s) return '';
  return [s.addressLine1, s.city, s.state, s.pin].filter(Boolean).join(', ');
}

export function Showroom({ settings }: { settings?: StoreSettings }) {
  const address = addressLine(settings);
  const location = address || 'Kanpur, Uttar Pradesh';
  const contact = settings?.phone || settings?.whatsapp || 'Saleem · +91 80901 09621';

  return (
    <section className="rc-section rc-section--dark" data-reveal>
      <div className="container">
        <div className="rc-showroom">
          <div>
            <span className="rc-eyebrow" style={{ '--rc-accent': '#ffffff' } as CSSProperties}>
              Visit · order · ride
            </span>
            <h2 className="rc-sec-title">A real shop in Kanpur.</h2>
            <p className="rc-sec-blurb rc-sec-blurb--light">
              Stellar Bikes is a bicycle shop in Kanpur, Uttar Pradesh. Order online with cash on
              delivery, or come and see the range in person.
            </p>
            <Link href="/shop" className="rc-btn rc-btn--light">
              Browse all cycles
            </Link>
          </div>
          <ul className="rc-facts">
            <li>
              <span className="rc-fact-k">Location</span>
              <span className="rc-fact-v">{location}</span>
            </li>
            <li>
              <span className="rc-fact-k">Payment</span>
              <span className="rc-fact-v">Cash on delivery</span>
            </li>
            <li>
              <span className="rc-fact-k">Contact</span>
              <span className="rc-fact-v">{contact}</span>
            </li>
            {settings?.hours && (
              <li>
                <span className="rc-fact-k">Hours</span>
                <span className="rc-fact-v">{settings.hours}</span>
              </li>
            )}
            {settings?.deliveryPolicy && (
              <li>
                <span className="rc-fact-k">Delivery</span>
                <span className="rc-fact-v">{settings.deliveryPolicy}</span>
              </li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
