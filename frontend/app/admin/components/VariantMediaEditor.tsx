'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, Film, Trash2 } from 'lucide-react';
import { guessMediaType, uploadConfigured, uploadMedia } from '@/lib/api';
import { safeSrc, imgError } from '@/lib/img';
import type { MediaItem } from '@/lib/types';

const MAX = 10; // mirrors MAX_VARIANT_MEDIA on the server

// The photos + videos of ONE variant, in the order customers will see them
// (top = first = what shows when the option is picked). Add by link or upload,
// move up/down, remove. `position` is just the row number — the server re-checks it.
export function VariantMediaEditor({
  media,
  onChange,
}: {
  media: MediaItem[];
  onChange: (next: MediaItem[]) => void;
}) {
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // Keep positions equal to row order after every change.
  const commit = (rows: Omit<MediaItem, 'position'>[]) => onChange(rows.map((m, position) => ({ ...m, position })));
  const full = media.length >= MAX;

  function addLink() {
    const url = link.trim();
    if (!url) return;
    if (!url.startsWith('/') && !url.startsWith('https://')) {
      setErr('Use a /path or an https:// link.');
      return;
    }
    setErr('');
    commit([...media, { url, type: guessMediaType(url) }]);
    setLink('');
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, MAX - media.length);
    e.target.value = '';
    if (files.length === 0) return;
    setBusy(true);
    setErr('');
    try {
      const added: Omit<MediaItem, 'position'>[] = [];
      for (const f of files) added.push(await uploadMedia(f)); // one at a time: keeps order + simple errors
      commit([...media, ...added]);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  }

  const move = (i: number, by: -1 | 1) => {
    const rows = [...media];
    [rows[i], rows[i + by]] = [rows[i + by], rows[i]];
    commit(rows);
  };

  return (
    <div className="admin-vmedia">
      {media.length === 0 && (
        <p className="muted">No photos or videos yet — customers will see “No Image Available” for this option.</p>
      )}
      {media.map((m, i) => (
        <div className="admin-vmedia-row" key={m.url + i}>
          <span className="admin-vmedia-pos" title="Display order">{i + 1}</span>
          <span className="admin-vmedia-thumb">
            {m.type === 'video' ? (
              <Film aria-hidden strokeWidth={1.75} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={safeSrc(m.url)} alt="" onError={imgError} />
            )}
          </span>
          <input
            className="admin-vmedia-url"
            aria-label={`Media ${i + 1} link`}
            value={m.url}
            onChange={(e) =>
              commit(media.map((x, j) => (j === i ? { url: e.target.value, type: guessMediaType(e.target.value) } : x)))
            }
          />
          <select
            aria-label={`Media ${i + 1} type`}
            value={m.type}
            onChange={(e) => commit(media.map((x, j) => (j === i ? { ...x, type: e.target.value as MediaItem['type'] } : x)))}
          >
            <option value="image">Photo</option>
            <option value="video">Video</option>
          </select>
          <button type="button" className="link-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
            <ArrowUp aria-hidden size={16} />
          </button>
          <button
            type="button"
            className="link-btn"
            disabled={i === media.length - 1}
            onClick={() => move(i, 1)}
            aria-label="Move down"
          >
            <ArrowDown aria-hidden size={16} />
          </button>
          <button
            type="button"
            className="link-btn danger"
            onClick={() => commit(media.filter((_, j) => j !== i))}
            aria-label="Remove"
          >
            <Trash2 aria-hidden size={16} />
          </button>
        </div>
      ))}

      <div className="admin-vmedia-add">
        <input
          placeholder="Paste a /path or https:// link to a photo or video"
          value={link}
          disabled={full}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault(); // Enter must not submit the whole product form
              addLink();
            }
          }}
        />
        <button type="button" className="btn-secondary" disabled={full || !link.trim()} onClick={addLink}>
          Add link
        </button>
        {uploadConfigured() && (
          <label className={`btn-secondary admin-img-upload ${full ? 'is-disabled' : ''}`}>
            {busy ? 'Uploading…' : 'Upload'}
            <input type="file" accept="image/*,video/*" multiple hidden onChange={onFile} disabled={busy || full} />
          </label>
        )}
      </div>
      <p className="muted admin-img-hint">
        {media.length}/{MAX} · the first item shows first on the product page.
      </p>
      {err && <div className="notice error">{err}</div>}
    </div>
  );
}
