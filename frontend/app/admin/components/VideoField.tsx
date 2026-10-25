'use client';

import { useState } from 'react';
import { uploadConfigured, uploadMedia } from '@/lib/api';
import { safeVideoSrc } from '@/lib/img';

// One video slot: a preview, an Upload button (when Cloudinary is set up), a link box,
// and Remove. An empty value means "use the video that ships with the site".
// Changes only take effect on the homepage after the page's Save button.
export function VideoField({
  label,
  help,
  value,
  onChange,
}: {
  label: string;
  help: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const playable = safeVideoSrc(value);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setErr('');
    try {
      const up = await uploadMedia(file);
      if (up.type !== 'video') throw new Error('That file is a picture. Please choose a video (MP4 works best).');
      onChange(up.url);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-video">
      <strong>{label}</strong>
      <p className="muted admin-img-hint">{help}</p>
      {playable ? (
        <video className="admin-video-preview" src={playable} controls muted playsInline preload="metadata" />
      ) : (
        <p className="muted">{value ? 'This link can’t be previewed here.' : 'Using the video that ships with the site.'}</p>
      )}
      <div className="admin-img-row">
        <input
          className="admin-img-url"
          placeholder="Paste an https:// video link, or upload"
          value={value}
          onChange={(e) => onChange(e.target.value.trim())}
        />
        {uploadConfigured() && (
          <label className="btn-secondary admin-img-upload">
            {busy ? 'Uploading…' : 'Upload video'}
            <input type="file" accept="video/*" hidden onChange={onFile} disabled={busy} />
          </label>
        )}
        {value && (
          <button type="button" className="link-btn danger" onClick={() => onChange('')}>
            Remove
          </button>
        )}
      </div>
      {err && <div className="notice error">{err}</div>}
    </div>
  );
}
