'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { offerLabel } from '@/lib/offers';
import type { MediaItem, Product, ProductInput } from '@/lib/types';
import { ImageField } from './ImageField';
import { VariantMediaEditor } from './VariantMediaEditor';

// Row shapes while editing (strings so inputs stay controlled); converted to the
// real ProductInput (paise, numbers) on submit.
type VariantRow = {
  _id?: string; // present for existing variants; preserved so ids are stable
  sku: string;
  size: string;
  color: string;
  price: string; // rupees
  compareAt: string; // rupees
  stock: string;
  lowStock: string;
  media: MediaItem[]; // this variant's photos/videos, in display order
};
type SpecRow = { key: string; value: string };

const blankVariant = (): VariantRow => ({ sku: '', size: '', color: '', price: '', compareAt: '', stock: '', lowStock: '3', media: [] });

const toRupees = (paise: number) => (paise ? String(paise / 100) : '');

function fromProduct(p: Product): State {
  return {
    slug: p.slug,
    name: p.name,
    category: p.category,
    description: p.description,
    image: p.image,
    images: p.images ?? [],
    featured: p.featured ?? false,
    offerTypes: p.offerTypes ?? [],
    status: (p.status as State['status']) ?? 'draft',
    specs: Object.entries(p.specs ?? {}).map(([key, value]) => ({ key, value })),
    variants: p.variants.map((v) => ({
      _id: v._id,
      sku: v.sku,
      size: v.size,
      color: v.color,
      price: toRupees(v.price),
      compareAt: toRupees(v.compareAt),
      stock: String(v.stock),
      lowStock: String(v.lowStock),
      media: [...(v.media ?? [])].sort((a, b) => a.position - b.position),
    })),
  };
}

type State = {
  slug: string;
  name: string;
  category: string;
  description: string;
  image: string;
  images: string[];
  featured: boolean;
  offerTypes: string[];
  status: 'draft' | 'published' | 'archived';
  specs: SpecRow[];
  variants: VariantRow[];
};

const empty: State = {
  slug: '',
  name: '',
  category: '',
  description: '',
  image: '',
  images: [],
  featured: false,
  offerTypes: [],
  status: 'draft',
  specs: [],
  variants: [blankVariant()],
};

export function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const [s, setS] = useState<State>(product ? fromProduct(product) : empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cats, setCats] = useState<string[]>([]); // category options from the Platform list
  const [offers, setOffers] = useState<string[]>([]); // offer-type options from the Platform list

  // Load the category list (the server union of stored + in-use categories).
  // Fails soft: an empty list just means the dropdown shows only the current value.
  useEffect(() => {
    adminApi.categories
      .list()
      .then((rows) => setCats(rows.map((r) => r.name)))
      .catch(() => undefined);
    adminApi.offerTypes
      .list()
      .then((rows) => setOffers(rows.map((r) => r.key)))
      .catch(() => undefined);
  }, []);

  // Always include the product's current category, even if it isn't in the list
  // yet (an older free-text value), so editing never silently drops it.
  const catOptions = [...new Set([...(s.category ? [s.category] : []), ...cats])];

  // Offer checkboxes: the master list plus anything already on the product.
  const offerOptions = [...new Set([...s.offerTypes, ...offers])];
  const toggleOffer = (key: string) =>
    set('offerTypes', s.offerTypes.includes(key) ? s.offerTypes.filter((k) => k !== key) : [...s.offerTypes, key]);

  const set = <K extends keyof State>(key: K, value: State[K]) => setS((prev) => ({ ...prev, [key]: value }));

  // Variant helpers
  const setVariant = (i: number, patch: Partial<VariantRow>) =>
    set('variants', s.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  const addVariant = () => set('variants', [...s.variants, blankVariant()]);
  const removeVariant = (i: number) => set('variants', s.variants.filter((_, j) => j !== i));

  // Spec helpers
  const setSpec = (i: number, patch: Partial<SpecRow>) =>
    set('specs', s.specs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const addSpec = () => set('specs', [...s.specs, { key: '', value: '' }]);
  const removeSpec = (i: number) => set('specs', s.specs.filter((_, j) => j !== i));

  // Gallery helpers
  const setGallery = (i: number, v: string) => set('images', s.images.map((x, j) => (j === i ? v : x)));
  const addGallery = () => set('images', [...s.images, '']);
  const removeGallery = (i: number) => set('images', s.images.filter((_, j) => j !== i));

  function build(): ProductInput {
    const rupeesToPaise = (r: string) => Math.round(Number(r || 0) * 100);
    return {
      slug: s.slug.trim(),
      name: s.name.trim(),
      category: s.category.trim(),
      description: s.description.trim(),
      image: s.image.trim(),
      images: s.images.map((x) => x.trim()).filter(Boolean),
      featured: s.featured,
      offerTypes: s.offerTypes,
      status: s.status,
      specs: Object.fromEntries(s.specs.filter((r) => r.key.trim()).map((r) => [r.key.trim(), r.value.trim()])),
      variants: s.variants.map((v) => ({
        ...(v._id ? { _id: v._id } : {}),
        sku: v.sku.trim(),
        size: v.size.trim(),
        color: v.color.trim(),
        price: rupeesToPaise(v.price),
        compareAt: rupeesToPaise(v.compareAt),
        stock: Math.round(Number(v.stock || 0)),
        lowStock: Math.round(Number(v.lowStock || 0)),
        media: v.media.map((m, position) => ({ url: m.url.trim(), type: m.type, position })),
      })),
    };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = build();
      if (product) await adminApi.products.update(product._id, payload);
      else await adminApi.products.create(payload);
      router.push('/admin/products');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
      setBusy(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={submit}>
      <div className="admin-form-grid">
        <label className="field">
          <span>Name</span>
          <input required value={s.name} onChange={(e) => set('name', e.target.value)} />
        </label>
        <label className="field">
          <span>Slug (URL id, lowercase-with-hyphens)</span>
          <input required value={s.slug} onChange={(e) => set('slug', e.target.value)} placeholder="metro-one" />
        </label>
        <label className="field">
          <span>Category</span>
          <select required value={s.category} onChange={(e) => set('category', e.target.value)}>
            <option value="" disabled>
              Choose a category…
            </option>
            {catOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Status</span>
          <select value={s.status} onChange={(e) => set('status', e.target.value as State['status'])}>
            <option value="draft">Draft (hidden)</option>
            <option value="published">Published (live)</option>
            <option value="archived">Archived (hidden)</option>
          </select>
        </label>
      </div>

      <label className="field">
        <span>Description</span>
        <textarea required rows={3} value={s.description} onChange={(e) => set('description', e.target.value)} />
      </label>

      <label className="admin-check">
        <input type="checkbox" checked={s.featured} onChange={(e) => set('featured', e.target.checked)} />
        <span>Featured (shows in Staff picks)</span>
      </label>

      <fieldset className="field admin-offers">
        <legend>Offer types (this product is part of…)</legend>
        {offerOptions.length === 0 ? (
          <p className="muted">No offer types yet. The owner can add them on the Platform page.</p>
        ) : (
          <div className="admin-offers-list">
            {offerOptions.map((k) => (
              <label className="admin-check" key={k}>
                <input type="checkbox" checked={s.offerTypes.includes(k)} onChange={() => toggleOffer(k)} />
                <span>{offerLabel(k)}</span>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <h2 className="admin-h2">Main photo</h2>
      <ImageField value={s.image} onChange={(v) => set('image', v)} />

      <h2 className="admin-h2">Gallery photos (optional)</h2>
      {s.images.map((img, i) => (
        <div className="admin-gallery-row" key={i}>
          <ImageField value={img} onChange={(v) => setGallery(i, v)} />
          <button type="button" className="link-btn danger" onClick={() => removeGallery(i)}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" className="btn-secondary" onClick={addGallery}>
        + Add gallery photo
      </button>

      <h2 className="admin-h2">Variants</h2>
      <p className="muted">
        At least one. Price in ₹. “Was” is the crossed-out compare-at price (0 = none). Open “Photos &amp; videos”
        under a row to set what customers see when they pick that option — an option with none shows “No Image
        Available”.
      </p>
      <div className="admin-variants">
        <div className="admin-variant-head">
          <span>SKU</span><span>Size</span><span>Colour</span><span>Price ₹</span><span>Was ₹</span><span>Stock</span><span>Low at</span><span />
        </div>
        {s.variants.map((v, i) => (
          <div className="admin-variant" key={i}>
          <div className="admin-variant-row">
            <input required placeholder="SKU" value={v.sku} onChange={(e) => setVariant(i, { sku: e.target.value })} />
            <input required placeholder="Size" value={v.size} onChange={(e) => setVariant(i, { size: e.target.value })} />
            <input required placeholder="Colour" value={v.color} onChange={(e) => setVariant(i, { color: e.target.value })} />
            <input required type="number" min={0} value={v.price} onChange={(e) => setVariant(i, { price: e.target.value })} />
            <input type="number" min={0} value={v.compareAt} onChange={(e) => setVariant(i, { compareAt: e.target.value })} />
            <input required type="number" min={0} value={v.stock} onChange={(e) => setVariant(i, { stock: e.target.value })} />
            <input required type="number" min={0} value={v.lowStock} onChange={(e) => setVariant(i, { lowStock: e.target.value })} />
            <button
              type="button"
              className="link-btn danger"
              disabled={s.variants.length === 1}
              onClick={() => removeVariant(i)}
            >
              ✕
            </button>
          </div>
          <details className="admin-variant-media">
            <summary>
              Photos &amp; videos for {v.size || v.color ? `${v.size} ${v.color}`.trim() : 'this option'} ({v.media.length})
            </summary>
            <VariantMediaEditor media={v.media} onChange={(media) => setVariant(i, { media })} />
          </details>
          </div>
        ))}
      </div>
      <button type="button" className="btn-secondary" onClick={addVariant}>
        + Add variant
      </button>

      <h2 className="admin-h2">Specs (optional)</h2>
      {s.specs.map((r, i) => (
        <div className="admin-spec-row" key={i}>
          <input placeholder="e.g. Wheel size" value={r.key} onChange={(e) => setSpec(i, { key: e.target.value })} />
          <input placeholder="e.g. 29 inch" value={r.value} onChange={(e) => setSpec(i, { value: e.target.value })} />
          <button type="button" className="link-btn danger" onClick={() => removeSpec(i)}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" className="btn-secondary" onClick={addSpec}>
        + Add spec
      </button>

      {error && <div className="notice error" style={{ marginTop: 16 }}>{error}</div>}

      <div className="admin-actions" style={{ marginTop: 20 }}>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Saving…' : product ? 'Save changes' : 'Create product'}
        </button>
        <button type="button" className="link-btn" onClick={() => router.push('/admin/products')}>
          Cancel
        </button>
      </div>
    </form>
  );
}
