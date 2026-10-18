import Link from 'next/link';
import type { CSSProperties } from 'react';
import { money } from '@/lib/api';
import type { CardProduct, CatTile, HomeData } from '@/lib/catalogue';
import { ProductCard } from '../ProductCard';
import { SectionHead } from './HomeRail';
import { RailCarousel } from './RailCarousel';

// --- Product carousels -------------------------------------------------------
// The expanded product rails, restored to the homepage as real carousels
// (arrows + dots). Placed below the two 3D moments so 3D stays the star.
// Offers/Kids self-guard on empty inside RailCarousel.

export function HomeCarousels({ data }: { data: HomeData }) {
  return (
    <>
      <RailCarousel
        section="rc-section--light"
        eyebrow="Fresh off the stand"
        title="New arrivals"
        blurb="The newest sample bikes, newest first."
        cards={data.newArrivals}
        href="/collections/new-arrivals"
        accent="#8bbf2e"
      />
      <RailCarousel
        section="rc-section--paper"
        eyebrow="Hand-picked by us"
        title="Staff picks"
        blurb="An editorial selection across the range — not a popularity ranking."
        cards={data.featured}
        href="/collections/staff-picks"
        accent="#2b4cff"
      />
      <RailCarousel
        section="rc-section--offer"
        tone="dark"
        eyebrow="Genuine markdowns"
        title="On offer now"
        blurb="Only real sample discounts — the crossed-out price is the variant's own compareAt."
        cards={data.offers}
        href="/collections/offers"
        accent="#ffffff"
      />
      <RailCarousel
        section="rc-section--kids"
        eyebrow="For the whole family"
        title="Kids & family"
        blurb="Smaller frames, lighter builds, first-ride friendly."
        cards={data.kids}
        href="/shop?category=Kids"
        accent="#0c6b60"
      />
    </>
  );
}

// --- Category explorer -------------------------------------------------------
// Distinct-from-a-grid: big tappable tiles, one per real category, each with its
// own accent so the page doesn't read as one repeated template.

const CAT_ACCENT: Record<string, string> = {
  Mountain: '#2b4cff',
  City: '#c0974a',
  Road: '#14161a',
  Kids: '#17b0a0',
  Accessories: '#ff5633',
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
              <img src={t.image} alt="" aria-hidden="true" loading="lazy" />
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

// --- Collections strip -------------------------------------------------------
// Entry points to the curated collection pages (the rails that moved off the
// 3D-forward homepage) plus the two category landing pages.

const COLLECTION_LINKS: { href: string; eyebrow: string; title: string; accent: string }[] = [
  { href: '/collections/new-arrivals', eyebrow: 'Fresh in', title: 'New arrivals', accent: '#8bbf2e' },
  { href: '/collections/staff-picks', eyebrow: 'Our pick', title: 'Staff picks', accent: '#2b4cff' },
  { href: '/collections/budget', eyebrow: 'Value', title: 'Budget picks', accent: '#c0974a' },
  { href: '/collections/offers', eyebrow: 'Save', title: 'On offer', accent: '#ff5633' },
  { href: '/shop?category=Kids', eyebrow: 'Family', title: 'Kids & family', accent: '#17b0a0' },
  { href: '/shop?category=Accessories', eyebrow: 'Add-ons', title: 'Accessories', accent: '#9a6bff' },
];

export function CollectionsStrip() {
  return (
    <section className="rc-section rc-section--paper" data-reveal>
      <div className="container">
        <SectionHead
          eyebrow="Shop the range"
          title="Collections"
          blurb="Jump straight to a curated set — each on its own page, built from real catalogue data."
        />
        <div className="rc-collink-grid">
          {COLLECTION_LINKS.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="rc-collink"
              style={{ ['--rc-accent' as string]: c.accent }}
            >
              <span className="rc-collink-eyebrow">{c.eyebrow}</span>
              <span className="rc-collink-title">{c.title}</span>
              <span className="rc-collink-go" aria-hidden="true">→</span>
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
            <img src={card.image} alt={`${card.name} — illustrative sample photo`} loading="lazy" />
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
// No invented address, phone, hours, or delivery promise — only what the real
// checkout already supports (COD) and the known city (Kanpur).

export function Showroom() {
  return (
    <section className="rc-section rc-section--dark" data-reveal>
      <div className="container">
        <div className="rc-showroom">
          <div>
            <span className="rc-eyebrow" style={{ '--rc-accent': '#c0974a' } as CSSProperties}>
              Visit · order · ride
            </span>
            <h2 className="rc-sec-title">A real shop in Kanpur.</h2>
            <p className="rc-sec-blurb rc-sec-blurb--light">
              Raju Cycles is a bicycle shop in Kanpur, Uttar Pradesh. Order online with cash on
              delivery, or come and see the range in person.
            </p>
            <Link href="/shop" className="rc-btn rc-btn--gold">
              Browse all cycles
            </Link>
          </div>
          <ul className="rc-facts">
            <li>
              <span className="rc-fact-k">Location</span>
              <span className="rc-fact-v">Kanpur, Uttar Pradesh</span>
            </li>
            <li>
              <span className="rc-fact-k">Payment</span>
              <span className="rc-fact-v">Cash on delivery</span>
            </li>
            <li>
              <span className="rc-fact-k">Contact</span>
              <span className="rc-fact-v">Phone &amp; showroom address coming soon</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
