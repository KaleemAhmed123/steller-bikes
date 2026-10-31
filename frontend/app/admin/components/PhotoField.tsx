'use client';

import { useRef, useState } from 'react';
import { uploadConfigured } from '@/lib/api';
import { safeSrc, imgError } from '@/lib/img';
import { PHOTO_TYPES, specText, uploadPhoto, type PhotoSpec } from '@/lib/photoUpload';
import './photoField.css';

// One photo the owner manages: a preview, Upload / Replace, Remove, and the size to use printed
// right beneath. Pasting a link stays available as a fallback. Used for the About page pictures.
export function PhotoField({
  value,
  onChange,
  spec,
  shape,
  label,
}: {
  value: string;
  onChange: (url: string) => void;
  spec: PhotoSpec;
  shape: 'wide' | 'standard' | 'square'; // the preview's proportions, matching how the page crops it
  label: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const canUpload = uploadConfigured();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // so choosing the same file again still fires
    if (!file) return;
    setBusy(true);
    setError('');
    setWarning('');
    try {
      const { url, warning: w } = await uploadPhoto(file, spec.min);
      onChange(url);
      setWarning(w);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pf">
      <div className={`pf-preview pf-${shape}`}>
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={safeSrc(value)} alt="" onError={imgError} />
        ) : (
          <span>No photo yet</span>
        )}
      </div>

      <div className="pf-actions">
        <input ref={input} type="file" accept={PHOTO_TYPES.join(',')} hidden onChange={onFile} />
        <button
          type="button"
          className="btn-secondary"
          disabled={busy || !canUpload}
          title={canUpload ? undefined : 'Photo upload is not switched on yet'}
          aria-label={`${value ? 'Replace' : 'Upload'} photo: ${label}`}
          onClick={() => input.current?.click()}
        >
          {busy ? 'Uploading…' : value ? 'Replace photo' : 'Upload photo'}
        </button>
        {value && (
          <button type="button" className="link-btn danger" aria-label={`Remove photo: ${label}`} onClick={() => { onChange(''); setWarning(''); }}>
            Remove
          </button>
        )}
      </div>

      <p className="pf-spec muted">{specText(spec)}</p>
      {warning && <p className="pf-warn" role="status">{warning}</p>}
      {error && <p className="pf-error" role="alert">{error}</p>}

      <details className="pf-link" open={!canUpload && !value}>
        <summary>Use an image link instead</summary>
        <input
          aria-label={`Image link: ${label}`}
          placeholder="/images/photo.jpg or https://…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </details>
    </div>
  );
}
