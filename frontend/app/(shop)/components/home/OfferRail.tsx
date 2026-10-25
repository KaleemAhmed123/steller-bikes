import { getProducts } from '@/lib/api';
import { toCard } from '@/lib/catalogue';
import type { OfferSection } from '@/lib/types';
import { RailCarousel } from './RailCarousel';
import { FireworkBurst } from './FireworkBurst';

// The seasonal offer rail (Diwali, New Year, …). Everything about it — on/off, the
// title, the subtitle and WHICH offer types it shows — is set in the admin (Site
// content), so the next sale season needs no code change. It is the same carousel
// + card style as the other product rails. Renders nothing when switched off or
// when no published product carries the chosen offer types.
export async function OfferRail({ offer }: { offer: OfferSection }) {
  if (!offer.enabled || offer.offerTypes.length === 0) return null;

  const types = offer.offerTypes.join(',');
  let cards;
  try {
    const { products } = await getProducts({ offerType: types }, { limit: 8 });
    cards = products.map(toCard);
  } catch {
    return null; // the rail is a bonus — never break the homepage over it
  }
  if (cards.length === 0) return null;

  return (
    <div className="rc-offer-rail">
      <RailCarousel
        section="rc-section--light"
        title={offer.title}
        blurb={offer.subtitle}
        cards={cards}
        href={`/shop?offerType=${encodeURIComponent(types)}`}
        accent="var(--brand-yellow)"
      />
      <FireworkBurst />
    </div>
  );
}
