import Link from 'next/link';
import { loadHomeData, type HomeData } from '@/lib/catalogue';
import { getSettings } from '@/lib/api';
import { HeroVideo } from './components/hero/HeroVideo';
import { RetailerGrid } from './components/home/RetailerGrid';
import { CategoryExplorer } from './components/home/HomeSections';
import { OfferRail } from './components/home/OfferRail';
import { OriginalsTeaser } from './components/home/OriginalsTeaser';
import { Showroom } from './components/home/Showroom';

// The homepage, top to bottom: hero video → authorized retailers → shop by
// category → seasonal offer rail → Stellar Originals → the showroom (visit · order · ride). All text, logos and the
// offer rail's on/off + offer types come from the admin (Site content).
export default async function HomePage() {
  let data: HomeData | null = null;
  try {
    data = await loadHomeData();
  } catch {
    data = null;
  }
  const settings = await getSettings();

  return (
    <>
      <HeroVideo hero={settings.hero} />

      <RetailerGrid retailers={settings.retailers} />

      {data ? (
        <CategoryExplorer tiles={data.tiles} />
      ) : (
        <div className="container">
          <div className="notice error" style={{ marginTop: 40 }}>
            Could not load the catalogue — is the API running? <Link href="/shop">Try the shop page</Link>.
          </div>
        </div>
      )}

      <OfferRail offer={settings.offerSection} />

      <OriginalsTeaser hero={settings.hero} />

      <Showroom settings={settings} />
    </>
  );
}
