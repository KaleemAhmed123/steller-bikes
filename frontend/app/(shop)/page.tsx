import Link from 'next/link';
import { loadHomeData, type HomeData } from '@/lib/catalogue';
import BikeHero from './components/hero/BikeHero';
import Brand3D from './components/hero/Brand3D';
import { CategoryExplorer, CollectionsStrip, HomeCarousels, Showroom } from './components/home/HomeSections';

// The homepage: a cinematic, 3D-forward experience. Two 3D moments (the hero
// sequence + a brand turntable), then lean shopping entry points — category
// tiles + a collections strip. The product rails live on their own dedicated
// pages (/collections/* and /shop) so the homepage stays focused on the 3D.
export default async function HomePage() {
  let data: HomeData | null = null;
  try {
    data = await loadHomeData();
  } catch {
    data = null;
  }

  return (
    <>
      <BikeHero />

      {!data && (
        <div className="container">
          <div className="notice error" style={{ marginTop: 40 }}>
            Could not load the catalogue — is the API running? The hero above still works.{' '}
            <Link href="/shop">Try the shop page</Link>.
          </div>
        </div>
      )}

      {data && <CategoryExplorer tiles={data.tiles} />}

      <Brand3D />

      {/* 3D stays the star (both moments above); the product carousels sit below. */}
      {data && <HomeCarousels data={data} />}

      <CollectionsStrip />

      <Showroom />
    </>
  );
}
