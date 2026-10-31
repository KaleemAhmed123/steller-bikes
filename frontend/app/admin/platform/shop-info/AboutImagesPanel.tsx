'use client';

import { useRef, useState } from 'react';
import { EMPTY_SETTINGS, uploadConfigured } from '@/lib/api';
import { PHOTO_TYPES, uploadPhoto, type PhotoSpec } from '@/lib/photoUpload';
import type { AboutImages, StoreSettings } from '@/lib/types';
import { PhotoField } from '../../components/PhotoField';
import { SaveRow } from '../../components/SaveRow';
import { useSave } from '../../components/useSave';

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

// While editing, each gallery photo carries a client-only id so React keeps the right row's state
// when one is removed from the middle. The id is stripped again before saving.
interface Photo { id: string; url: string; alt: string }
type Draft = Omit<AboutImages, 'gallery'> & { gallery: Photo[] };

let photoCount = 0;
const newId = () => `photo-${++photoCount}`;
const toDraft = (a: AboutImages): Draft => ({ ...a, gallery: a.gallery.map((p) => ({ ...p, id: newId() })) });
// What gets saved: a gallery row with no picture chosen yet is dropped rather than rejected.
const toPayload = (d: Draft): AboutImages => ({ ...d, gallery: d.gallery.filter((p) => p.url.trim()).map(({ url, alt }) => ({ url, alt })) });
// Compare by content, in a fixed order, so key order from the server can't cause a false "unsaved".
const snapshot = (a: AboutImages) => JSON.stringify([SLOTS.map((s) => a[s.key]), a.gallery.map((p) => [p.url, p.alt])]);

// Upload, replace or remove the About page's pictures.
export function AboutImagesPanel({ settings, onSaved }: { settings: Partial<StoreSettings>; onSaved: (s: StoreSettings) => void }) {
  const saved = settings.aboutImages ?? EMPTY_SETTINGS.aboutImages;
  const [draft, setDraft] = useState<Draft>(() => toDraft(saved));
  const [adding, setAdding] = useState('');
  const [addError, setAddError] = useState('');
  const picker = useRef<HTMLInputElement>(null);
  const { busy, message, error, save } = useSave(onSaved);
  const dirty = snapshot(toPayload(draft)) !== snapshot(saved);
  const canUpload = uploadConfigured();
  const galleryMax = settings.galleryMax ?? 0; // the server's limit, sent with the settings

  const setSlot = (key: SlotKey, value: string) => setDraft((d) => ({ ...d, [key]: value }));
  const setPhoto = (id: string, patch: Partial<Pick<Photo, 'url' | 'alt'>>) =>
    setDraft((d) => ({ ...d, gallery: d.gallery.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));

  // Several photos at once: upload them one after another and add each to the gallery.
  async function addPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, galleryMax - draft.gallery.length);
    e.target.value = '';
    if (!files.length) return;
    setAddError('');
    const failed: string[] = [];
    for (const [i, file] of files.entries()) {
      setAdding(`Uploading ${i + 1} of ${files.length}…`);
      try {
        const { url } = await uploadPhoto(file, SQUARE.min);
        setDraft((d) => ({ ...d, gallery: [...d.gallery, { id: newId(), url, alt: '' }] }));
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
        save({ aboutImages: toPayload(draft) });
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
        <p className="muted">Shop, team and customer photos shown in a strip near the end of the page. Up to {galleryMax}.</p>

        <div className="si-gallery">
          {draft.gallery.map((photo, i) => (
            <div className="si-slot" key={photo.id}>
              <PhotoField label={`gallery photo ${i + 1}`} value={photo.url} onChange={(v) => setPhoto(photo.id, { url: v })} spec={SQUARE} shape="square" />
              <input
                aria-label={`Description of gallery photo ${i + 1}`}
                placeholder="Short description for screen readers (optional)"
                maxLength={120}
                value={photo.alt}
                onChange={(e) => setPhoto(photo.id, { alt: e.target.value })}
              />
              <button type="button" className="link-btn danger" onClick={() => setDraft((d) => ({ ...d, gallery: d.gallery.filter((p) => p.id !== photo.id) }))}>
                Remove from gallery
              </button>
            </div>
          ))}
        </div>

        <div className="si-add">
          <input ref={picker} type="file" accept={PHOTO_TYPES.join(',')} multiple hidden onChange={addPhotos} />
          <button type="button" className="btn-secondary" disabled={!canUpload || !!adding || draft.gallery.length >= galleryMax} onClick={() => picker.current?.click()}>
            {adding || 'Add photos'}
          </button>
          <button
            type="button"
            className="link-btn"
            disabled={draft.gallery.length >= galleryMax}
            onClick={() => setDraft((d) => ({ ...d, gallery: [...d.gallery, { id: newId(), url: '', alt: '' }] }))}
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
