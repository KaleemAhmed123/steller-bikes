import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProduct, getProducts } from '@/lib/api';
import { toCard } from '@/lib/catalogue';
import { AddToCart } from '../../components/AddToCart';
import { ZoomImage } from '../../components/ZoomImage';
import { WishlistButton } from '../../components/WishlistButton';
import { ProductCard } from '../../components/ProductCard';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: 'Not found — Raju Cycles' };
  return { title: `${product.name} — Raju Cycles`, description: product.description };
}

// Product detail: a bold editorial intro over a practical purchasing panel.
// Server component (full HTML for SEO); the buy panel + zoom are the only
// client islands.
export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const specs = Object.entries(product.specs ?? {});

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

      <article className="rc-detail">
        <div className="rc-detail-media">
          <ZoomImage src={product.image} alt={`${product.name} — illustrative sample photo`} />
        </div>

        <div className="rc-detail-info">
          <div className="rc-detail-top">
            <span className="rc-card-cat">{product.category}</span>
            <WishlistButton slug={product.slug} name={product.name} variant="inline" />
          </div>
          <h1 className="rc-detail-title">{product.name}</h1>
          <p className="rc-detail-desc">{product.description}</p>

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

          <p className="rc-detail-note">
            Stock and price are tracked per option above. Photos are illustrative sample images
            (one per product for now).
          </p>

          {specs.length > 0 && (
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
          )}
        </div>
      </article>

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
