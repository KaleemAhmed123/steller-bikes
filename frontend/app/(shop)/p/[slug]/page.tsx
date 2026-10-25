import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProduct, getProducts, getSettings } from '@/lib/api';
import { toCard } from '@/lib/catalogue';
import { AddToCart } from '../../components/AddToCart';
import { ProductGallery } from '../../components/ProductGallery';
import { VariantSelection } from '../../components/VariantSelection';
import { WishlistButton } from '../../components/WishlistButton';
import { ProductCard } from '../../components/ProductCard';
import { OfferTags } from '../../components/OfferTags';
import { DeliveryInfo } from '../../components/DeliveryInfo';
import { PincodeCheck } from '../../components/PincodeCheck';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: 'Not found — Stellar Bikes' };
  return { title: `${product.name} — Stellar Bikes`, description: product.description };
}

// Product detail: a bold editorial intro over a practical purchasing panel.
// Server component (full HTML for SEO); the buy panel + zoom are the only
// client islands.
export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const { kanpurDeliveryFee } = await getSettings();
  const specs = Object.entries(product.specs ?? {});
  // Start on the first option that's in stock (same rule the buy panel used before).
  const initialVariant = product.variants.find((v) => v.stock > 0) ?? product.variants[0];

  // Honest recommendations: real products in the same category (not a faked
  // "frequently bought together"). Omitted entirely if there are none.
  let related = [] as ReturnType<typeof toCard>[];
  try {
    const { products } = await getProducts({ category: product.category });
    related = products.filter((p) => p.slug !== product.slug).slice(0, 4).map(toCard);
  } catch {
    related = [];
  }

  return (
    <div className="rc-detail-page container">
      <nav className="rc-crumbs" aria-label="Breadcrumb">
        <Link href="/shop">Shop</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/shop?category=${encodeURIComponent(product.category)}`}>{product.category}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{product.name}</span>
      </nav>

      <VariantSelection initialId={initialVariant?._id ?? ''}>
      <article className="rc-detail">
        <div className="rc-detail-media">
          <ProductGallery
            variants={product.variants.map((v) => ({ variantId: v._id, media: v.media ?? [] }))}
            name={product.name}
          />
          <OfferTags types={product.offerTypes ?? []} linked />
        </div>

        {/* Buy panel: only what's needed to choose and buy. Price, options, quantity,
            Add to cart and the stock line all live inside <AddToCart>. */}
        <div className="rc-detail-info">
          <div className="rc-detail-top">
            <span className="rc-card-cat">{product.category}</span>
            <WishlistButton slug={product.slug} name={product.name} variant="inline" />
          </div>
          <h1 className="rc-detail-title">{product.name}</h1>

          <AddToCart
            variants={product.variants.map((v) => ({
              variantId: v._id,
              size: v.size,
              color: v.color,
              price: v.price,
              compareAt: v.compareAt,
              stock: v.stock,
              lowStock: v.lowStock,
            }))}
          />

          {/* Delivery promise, visible before Add to cart so checkout holds no surprises. */}
          <DeliveryInfo fee={kanpurDeliveryFee} variant="compact" />
          <PincodeCheck />
        </div>
      </article>
      </VariantSelection>

      {/* Details band: description on the left, specifications on the right
          (stacked on phones). */}
      <section className={`rc-detail-more ${specs.length === 0 ? 'is-single' : ''}`} aria-label="Product details">
        <div className="rc-detail-more-col">
          <h2 className="rc-detail-more-title">Description</h2>
          <p className="rc-detail-desc">{product.description}</p>
        </div>

        {specs.length > 0 && (
          <div className="rc-detail-more-col">
            <h2 className="rc-detail-more-title">Specifications</h2>
            <table className="rc-specs">
              <caption className="rc-sr-only">Specifications</caption>
              <tbody>
                {specs.map(([key, value]) => (
                  <tr key={key}>
                    <th scope="row">{key}</th>
                    <td>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="rc-detail-note">Stock and price are tracked per option above.</p>
      </section>

      {related.length > 0 && (
        <section className="rc-related">
          <h2 className="rc-sec-title">More in {product.category}</h2>
          <div className="rc-grid">
            {related.map((c) => (
              <ProductCard card={c} key={c.slug} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
