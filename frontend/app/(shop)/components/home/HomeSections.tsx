import Link from 'next/link';
import { safeSrc } from '@/lib/img';
import type { CSSProperties } from 'react';
import type { CatTile } from '@/lib/catalogue';
import { SectionHead } from './HomeRail';

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
          title="Shop by category"
          blurb="Choose from our curated categories"
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
