'use client';

import { useState } from 'react';
import type { StoreSettings } from '@/lib/types';
import { SaveRow } from './SaveRow';
import { useSave } from './useSave';

// Where the shop's "Open in Maps" button goes.
export function LocationPanel({ settings, onSaved }: { settings: Partial<StoreSettings>; onSaved: (s: StoreSettings) => void }) {
  const [link, setLink] = useState(settings.mapLink ?? '');
  const { busy, message, error, save } = useSave(onSaved);
  const dirty = link.trim() !== (settings.mapLink ?? '');

  return (
    <form
      className="si-card"
      onSubmit={(e) => {
        e.preventDefault();
        save({ mapLink: link.trim() });
      }}
    >
      <h2 className="admin-h2">Map location</h2>
      <p className="muted">Where the “Open in Maps” button on the shop’s Location row takes people. Leave empty to turn the button off.</p>
      <label className="field">
        <span>Google Maps link</span>
        <input value={link} placeholder="https://maps.app.goo.gl/…" onChange={(e) => setLink(e.target.value)} />
      </label>
      <p className="muted si-hint">
        Open the shop in Google Maps, tap <b>Share</b>, then <b>Copy link</b>, and paste it here. A Maps share link opens the
        Maps app on Android and iPhone; other links may only open a web page.
      </p>
      {link.trim() && (
        <a className="btn-secondary si-test" href={link.trim()} target="_blank" rel="noopener noreferrer">
          Test link
        </a>
      )}
      <SaveRow busy={busy} dirty={dirty} message={message} error={error} />
    </form>
  );
}
