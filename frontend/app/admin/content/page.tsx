'use client';

import { useEffect, useState } from 'react';
import { adminApi, EMPTY_SETTINGS } from '@/lib/api';
import { offerLabel } from '@/lib/offers';
import type { HeroContent, OfferSection, Retailer } from '@/lib/types';
import { ImageField } from '../components/ImageField';

// "Site content" (owner-only): the storefront copy that used to need a developer —
// the text over the hero video, the homepage offer rail, and the Authorized
// Retailers logo grid. One Save sends all three (PATCH /api/admin/settings); the
// API merges the Canva defaults for anything never saved.
type Content = { hero: HeroContent; offerSection: OfferSection; retailers: Retailer[] };

const MAX_RETAILERS = 24;

const HERO_FIELDS: [keyof HeroContent, string, string][] = [
  ['statValue', 'Big number', '60,000+'],
  ['statLabel', 'Under the number', 'TRUSTED CUSTOMERS'],
  ['tagline', 'Line above the button', 'Sellers of Various Brands'],
  ['ctaLabel', 'Button text', 'EXPLORE OUR RANGES'],
  ['ctaHref', 'Button link', '/shop'],
  ['promoTitle', 'Stellar Originals title', 'STELLAR ORIGINALS'],
  ['promoSubtitle', 'Stellar Originals subtitle', 'Coming Soon'],
  ['promoHref', 'Stellar Originals link (optional)', '/shop?category=Originals'],
];

const LINK_HELP = 'A link starts with / (a page on this site, e.g. /shop) or https:// (another website).';
const LOGO_HINT =
  'Paste a link (https://… or /logos/name.png) or click Upload. PNG, SVG or WebP with a transparent background, about 300×150 px, under 500 KB.';

export default function AdminContent() {
  const [c, setC] = useState<Content | null>(null);
  const [offerKeys, setOfferKeys] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    adminApi.settings
      .get()
      .then((d) =>
        setC({
          hero: { ...EMPTY_SETTINGS.hero, ...d.hero },
          offerSection: { ...EMPTY_SETTINGS.offerSection, ...d.offerSection },
          retailers: d.retailers ?? [],
        }),
      )
      .catch((e: Error) => setError(e.message));
    adminApi.offerTypes
      .list()
      .then((rows) => setOfferKeys(rows.map((r) => r.key)))
      .catch(() => undefined);
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!c) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await adminApi.settings.update(c);
      setMessage('Saved. The homepage shows the new content on the next load.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  }

  if (error && !c) return <div className="notice error">{error}</div>;
  if (!c) return <p className="muted">Loading…</p>;

  const setHero = (key: keyof HeroContent, value: string) => setC({ ...c, hero: { ...c.hero, [key]: value } });
  const setOffer = (patch: Partial<OfferSection>) => setC({ ...c, offerSection: { ...c.offerSection, ...patch } });
  const toggleOfferType = (key: string) =>
    setOffer({
      offerTypes: c.offerSection.offerTypes.includes(key)
        ? c.offerSection.offerTypes.filter((k) => k !== key)
        : [...c.offerSection.offerTypes, key],
    });

  const setRetailer = (i: number, patch: Partial<Retailer>) =>
    setC({ ...c, retailers: c.retailers.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  const addRetailer = () => setC({ ...c, retailers: [...c.retailers, { name: '', logo: '', href: '' }] });
  const removeRetailer = (i: number) => setC({ ...c, retailers: c.retailers.filter((_, j) => j !== i) });
  const moveRetailer = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= c.retailers.length) return;
    const next = [...c.retailers];
    [next[i], next[j]] = [next[j], next[i]];
    setC({ ...c, retailers: next });
  };

  const offerOptions = [...new Set([...c.offerSection.offerTypes, ...offerKeys])];

  return (
    <div>
      <h1 className="admin-h1">Site content</h1>
      <p className="muted">
        The homepage text, the seasonal offer rail and the retailer logos. Leave a text field empty to hide that line.
      </p>

      <form className="admin-form" onSubmit={save}>
        <h2 className="admin-h2">Hero text (over the video)</h2>
        <p className="muted">{LINK_HELP} Leave the Stellar Originals link empty and that text is not clickable.</p>
        <div className="admin-form-grid">
          {HERO_FIELDS.map(([key, label, placeholder]) => (
            <label className="field" key={key}>
              <span>{label}</span>
              <input value={c.hero[key]} placeholder={placeholder} onChange={(e) => setHero(key, e.target.value)} />
            </label>
          ))}
        </div>

        <h2 className="admin-h2" style={{ marginTop: 32 }}>
          Offer rail (homepage)
        </h2>
        <p className="muted">
          Switch it on for a sale season, set the title and subtitle, and pick which offer types it shows. Add new offer
          types on the Platform page and tag products in the product form.
        </p>
        <label className="admin-check">
          <input
            type="checkbox"
            checked={c.offerSection.enabled}
            onChange={(e) => setOffer({ enabled: e.target.checked })}
          />
          <span>Show the offer rail on the homepage</span>
        </label>
        <div className="admin-form-grid">
          <label className="field">
            <span>Title</span>
            <input value={c.offerSection.title} placeholder="Diwali Offer" onChange={(e) => setOffer({ title: e.target.value })} />
          </label>
          <label className="field">
            <span>Subtitle</span>
            <input
              value={c.offerSection.subtitle}
              placeholder="Boat Headphones available on selective products"
              onChange={(e) => setOffer({ subtitle: e.target.value })}
            />
          </label>
        </div>
        <fieldset className="field admin-offers">
          <legend>Offer types shown in the rail</legend>
          {offerOptions.length === 0 ? (
            <p className="muted">No offer types yet — add one on the Platform page.</p>
          ) : (
            <div className="admin-offers-list">
              {offerOptions.map((k) => (
                <label className="admin-check" key={k}>
                  <input
                    type="checkbox"
                    checked={c.offerSection.offerTypes.includes(k)}
                    onChange={() => toggleOfferType(k)}
                  />
                  <span>{offerLabel(k)}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <h2 className="admin-h2" style={{ marginTop: 32 }}>
          Authorized retailers
        </h2>
        <p className="muted">
          Logos shown in the homepage grid, in this order (up to {MAX_RETAILERS}). The optional link must start with
          https://.
        </p>
        {c.retailers.map((r, i) => (
          <div className="admin-retailer" key={i}>
            <div className="admin-form-grid">
              <label className="field">
                <span>Name</span>
                <input value={r.name} placeholder="Hero Cycles" onChange={(e) => setRetailer(i, { name: e.target.value })} />
              </label>
              <label className="field">
                <span>Website (optional, https://…)</span>
                <input
                  value={r.href}
                  placeholder="https://www.herocycles.com"
                  onChange={(e) => setRetailer(i, { href: e.target.value })}
                />
              </label>
            </div>
            <div className="field">
              <span>Logo</span>
              <ImageField value={r.logo} onChange={(v) => setRetailer(i, { logo: v })} hint={LOGO_HINT} />
            </div>
            <div className="admin-row-actions">
              <button type="button" className="link-btn" onClick={() => moveRetailer(i, -1)} disabled={i === 0}>
                Move up
              </button>
              <button
                type="button"
                className="link-btn"
                onClick={() => moveRetailer(i, 1)}
                disabled={i === c.retailers.length - 1}
              >
                Move down
              </button>
              <button type="button" className="link-btn danger" onClick={() => removeRetailer(i)}>
                Remove
              </button>
            </div>
          </div>
        ))}
        <button type="button" className="btn-secondary" onClick={addRetailer} disabled={c.retailers.length >= MAX_RETAILERS}>
          + Add retailer
        </button>

        {message && <div className="notice">{message}</div>}
        {error && <div className="notice error">{error}</div>}

        <div className="admin-actions" style={{ marginTop: 16 }}>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save site content'}
          </button>
        </div>
      </form>
    </div>
  );
}
