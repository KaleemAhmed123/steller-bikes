'use client';

import { useRef, useState } from 'react';
import { uploadConfigured } from '@/lib/api';
import { PHOTO_TYPES, uploadPhoto, type PhotoSpec } from '@/lib/photoUpload';
import type { AboutImages, StoreSettings } from '@/lib/types';
import { PhotoField } from '../../components/PhotoField';
import { SaveRow } from './SaveRow';
import { useSave } from './useSave';

const GALLERY_MAX = 24; // keep in step with GALLERY_MAX in backend/src/lib/shopInfo.ts

// The sizes below match how app/(shop)/about crops each picture (object-fit: cover).
const WIDE: PhotoSpec = { ratio: '21:8', best: { w: 2100, h: 800 }, min: { w: 1600, h: 610 }, note: 'On phones the sides are trimmed.' };
const SECTION: PhotoSpec = { ratio: '4:3', best: { w: 1200, h: 900 }, min: { w: 800, h: 600 }, note: 'Other shapes are trimmed to fit.' };
const SQUARE: PhotoSpec = { ratio: '1:1', best: { w: 1000, h: 1000 }, min: { w: 600, h: 600 }, note: 'Shown as a square; other shapes are trimmed.' };

type SlotKey = Exclude<keyof AboutImages, 'gallery'>;
const SLOTS: { key: SlotKey; label: string; spec: PhotoSpec; shape: 'wide' | 'standard' }[] = [
  { key: 'hero', label: 'Hero banner (top of the page)', spec: WIDE, shape: 'wide' },
  { key: 'story', label: 'Our Story', spec: SECTION, shape: 'standard' },
  { key: 'matters', label: 'Why Bicycles Matter', spec: SECTION, shape: 'standard' },
  { key: 'brand', label: 'Stellar Bicycle', spec: SECTION, shape: 'standard' },
  { key: 'guarantee', label: 'Lifetime Frame Guarantee', spec: SECTION, shape: 'standard' },
];

const EMPTY: AboutImages = { hero: '', story: '', matters: '', brand: '', guarantee: '', gallery: [] };

// Upload, replace or remove the About page's pictures.
export function AboutImagesPanel({ settings, onSaved }: { settings: Partial<StoreSettings>; onSaved: (s: StoreSettings) => void }) {
  const saved = settings.aboutImages ?? EMPTY;
  const [draft, setDraft] = useState<AboutImages>(saved);
  const [adding, setAdding] = useState('');
  const [addError, setAddError] = useState('');
  const picker = useRef<HTMLInputElement>(null);
  const { busy, message, error, save } = useSave(onSaved);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const canUpload = uploadConfigured();

  const setSlot = (key: SlotKey, value: string) => setDraft((d) => ({ ...d, [key]: value }));
  const setPhoto = (i: number, patch: Partial<AboutImages['gallery'][number]>) =>
    setDraft((d) => ({ ...d, gallery: d.gallery.map((p, j) => (j === i ? { ...p, ...patch } : p)) }));

  // Several photos at once: upload them one after another and add each to the gallery.
  async function addPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, GALLERY_MAX - draft.gallery.length);
    e.target.value = '';
    if (!files.length) return;
    setAddError('');
    const failed: string[] = [];
    for (const [i, file] of files.entries()) {
      setAdding(`Uploading ${i + 1} of ${files.length}…`);
      try {
        const { url } = await uploadPhoto(file, SQUARE.min);
        setDraft((d) => ({ ...d, gallery: [...d.gallery, { url, alt: '' }] }));
      } catch (err) {
        failed.push(`${file.name}: ${err instanceof Error ? err.message : 'upload failed'}`);
      }
    }
    setAdding('');
    if (failed.length) setAddError(failed.join(' '));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // A gallery row with no picture chosen yet is dropped rather than rejected.
        save({ aboutImages: { ...draft, gallery: draft.gallery.filter((p) => p.url.trim()) } });
      }}
    >
      {!canUpload && (
        <div className="notice">
          Photo upload isn’t switched on yet. Add the two Cloudinary values to the website’s settings (see the playbook,
          section 1b) and restart it, and the <b>Upload</b> buttons below start working. Until then you can paste an image
          link under “Use an image link instead”.
        </div>
      )}

      <section className="si-card">
        <h2 className="admin-h2">Section pictures</h2>
        <p className="muted">One picture beside each section of the About page. Press Remove to take a picture off.</p>
        <div className="si-slots">
          {SLOTS.map(({ key, label, spec, shape }) => (
            <div className={`si-slot${shape === 'wide' ? ' si-slot--wide' : ''}`} key={key}>
              <h3 className="si-slot-title">{label}</h3>
              <PhotoField label={label} value={draft[key]} onChange={(v) => setSlot(key, v)} spec={spec} shape={shape} />
            </div>
          ))}
        </div>
      </section>

      <section className="si-card">
        <h2 className="admin-h2">Gallery</h2>
        <p className="muted">Shop, team and customer photos shown in a strip near the end of the page. Up to {GALLERY_MAX}.</p>

        <div className="si-gallery">
          {draft.gallery.map((photo, i) => (
            <div className="si-slot" key={i}>
              <PhotoField label={`gallery photo ${i + 1}`} value={photo.url} onChange={(v) => setPhoto(i, { url: v })} spec={SQUARE} shape="square" />
              <input
                aria-label={`Description of gallery photo ${i + 1}`}
                placeholder="Short description for screen readers (optional)"
                maxLength={120}
                value={photo.alt}
                onChange={(e) => setPhoto(i, { alt: e.target.value })}
              />
              <button type="button" className="link-btn danger" onClick={() => setDraft((d) => ({ ...d, gallery: d.gallery.filter((_, j) => j !== i) }))}>
                Remove from gallery
              </button>
            </div>
          ))}
        </div>

        <div className="si-add">
          <input ref={picker} type="file" accept={PHOTO_TYPES.join(',')} multiple hidden onChange={addPhotos} />
          <button type="button" className="btn-secondary" disabled={!canUpload || !!adding || draft.gallery.length >= GALLERY_MAX} onClick={() => picker.current?.click()}>
            {adding || 'Add photos'}
          </button>
          <button
            type="button"
            className="link-btn"
            disabled={draft.gallery.length >= GALLERY_MAX}
            onClick={() => setDraft((d) => ({ ...d, gallery: [...d.gallery, { url: '', alt: '' }] }))}
          >
            Add a photo by link
          </button>
        </div>
        <p className="muted si-hint">You can pick several photos at once. Best {SQUARE.best.w} × {SQUARE.best.h} px, at least {SQUARE.min.w} × {SQUARE.min.h} px. JPG, PNG or WebP, under 5 MB each.</p>
        {addError && <p className="pf-error" role="alert">{addError}</p>}
      </section>

      <SaveRow busy={busy} dirty={dirty} message={message} error={error} />
    </form>
  );
}
