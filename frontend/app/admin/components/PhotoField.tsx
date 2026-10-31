'use client';

import { useEffect, useRef, useState } from 'react';
import { safeSrc, imgError } from '@/lib/img';
import { PHOTO_TYPES, specText, uploadPhoto, type PhotoSpec } from '@/lib/photoUpload';
import { useFileUpload } from './useFileUpload';
import { useUploadsEnabled } from './useUploadsEnabled';
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
  const { busy, error, warning, clearWarning, onFile } = useFileUpload((file) => uploadPhoto(file, spec.min), onChange);
  const uploads = useUploadsEnabled(); // null while the server is asked
  const canUpload = uploads === true;
  // With no upload available the link box opens by itself, once. After that it stays the owner's to open or
  // close: tying `open` to the value would collapse the box on the first typed character.
  const [linkOpen, setLinkOpen] = useState(false);
  useEffect(() => {
    if (uploads === false && !value) setLinkOpen(true);
  }, [uploads]); // eslint-disable-line react-hooks/exhaustive-deps -- only react to the server's answer, not to typing

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
          <button type="button" className="link-btn danger" aria-label={`Remove photo: ${label}`} onClick={() => { onChange(''); clearWarning(); }}>
            Remove
          </button>
        )}
      </div>

      <p className="pf-spec muted">{specText(spec)}</p>
      {warning && <p className="pf-warn" role="status">{warning}</p>}
      {error && <p className="pf-error" role="alert">{error}</p>}

      <details className="pf-link" open={linkOpen} onToggle={(e) => setLinkOpen(e.currentTarget.open)}>
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
