import { BrandLoader } from '@/components/BrandLoader';

// Shown while a shop page loads: a blank page with the blinking Stellar mark and the
// word STELLAR appearing letter by letter. It fades in after a short delay (see
// .brand-loader), so quick navigations never flash a splash screen.
export default function ShopLoading() {
  return <BrandLoader />;
}
