'use client';

import { useState } from 'react';
import { uploadImage, uploadConfigured } from '@/lib/api';
import { safeSrc, imgError } from '@/lib/img';

// A single image field: a link/path input plus (when Cloudinary is set up) an
// Upload button, with a preview. Shared by the product form and the retailer logos.
// `hint` is the format note shown under the field.
export function ImageField({
  value,
  onChange,
  hint,
}: {
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setErr('');
    try {
      onChange(await uploadImage(file));
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Upload failed.');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  return (
    <div className="admin-img">
      <div className="admin-img-row">
        <input
          className="admin-img-url"
          placeholder="/images/bike.jpg or https://…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {uploadConfigured() && (
          <label className="btn-secondary admin-img-upload">
            {busy ? 'Uploading…' : 'Upload'}
            <input type="file" accept="image/*" hidden onChange={onFile} disabled={busy} />
          </label>
        )}
      </div>
      {hint && <p className="muted admin-img-hint">{hint}</p>}
      {err && <div className="notice error">{err}</div>}
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="admin-img-preview" src={safeSrc(value)} alt="" onError={imgError} />
      )}
    </div>
  );
}
