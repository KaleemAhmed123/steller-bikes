'use client';

import { useState } from 'react';
import type { StoreSettings } from '@/lib/types';
import { SaveRow } from './SaveRow';
import { useSave } from './useSave';

// The person and number customers are shown (footer, showroom, About page).
export function ContactPanel({ settings, onSaved }: { settings: Partial<StoreSettings>; onSaved: (s: StoreSettings) => void }) {
  const [name, setName] = useState(settings.contactName ?? '');
  const [phone, setPhone] = useState(settings.contactPhone ?? '');
  const { busy, message, error, save } = useSave(onSaved);
  const dirty = name.trim() !== (settings.contactName ?? '') || phone.trim() !== (settings.contactPhone ?? '');

  return (
    <form
      className="si-card"
      onSubmit={(e) => {
        e.preventDefault();
        save({ contactName: name.trim(), contactPhone: phone.trim() });
      }}
    >
      <h2 className="admin-h2">Contact</h2>
      <p className="muted">Shown in the shop’s footer and in the Location section on the home page.</p>
      <div className="admin-form-grid">
        <label className="field">
          <span>Name</span>
          <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          <span>Phone number</span>
          <input type="tel" value={phone} maxLength={25} placeholder="+91-8931076870" onChange={(e) => setPhone(e.target.value)} />
        </label>
      </div>
      <SaveRow busy={busy} dirty={dirty} message={message} error={error} />
    </form>
  );
}
