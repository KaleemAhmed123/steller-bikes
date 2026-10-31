import { withSiteContent } from './siteContent.js';
import { withPromoStrip } from './promoStrip.js';
import { withShopInfo } from './shopInfo.js';

// Every admin-editable setting group has its defaults merged in its own lib. This is the one
// place that applies them all, so the public and admin settings routes cannot drift apart.
export function withStoreDefaults<T extends object>(doc: T | null | undefined) {
  return withShopInfo(withPromoStrip(withSiteContent(doc)));
}
