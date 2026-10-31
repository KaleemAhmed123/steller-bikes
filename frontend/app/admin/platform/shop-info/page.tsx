'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import type { StoreSettings } from '@/lib/types';
import { PageSkeleton } from '@/components/PageSkeleton';
import { AboutImagesPanel } from './AboutImagesPanel';
import { ContactPanel } from './ContactPanel';
import { LocationPanel } from './LocationPanel';
import './shopInfo.css';

// "Shop info" (owner-only, under Platform): the map link behind the shop's "Open in Maps"
// button, the contact name and number, and the About page's pictures. Each inner tab saves
// on its own; they all write to the one settings document.
const TABS = [
  { id: 'location', label: 'Location', Panel: LocationPanel },
  { id: 'contact', label: 'Contact', Panel: ContactPanel },
  { id: 'about', label: 'About images', Panel: AboutImagesPanel },
] as const;

export default function AdminShopInfo() {
  const [settings, setSettings] = useState<Partial<StoreSettings> | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('location');

  useEffect(() => {
    adminApi.settings.get().then(setSettings).catch((e: Error) => setError(e.message));
  }, []);

  if (error && !settings) return <div className="notice error">{error}</div>;
  if (!settings) return <PageSkeleton />;

  const Active = TABS.find((t) => t.id === tab)!.Panel;
  return (
    <div>
      <h1 className="admin-h1">Shop info</h1>
      <p className="muted">The map link, the contact details and the About page pictures.</p>

      <div className="si-tabs" role="tablist" aria-label="Shop info sections">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" id={`si-tab-${t.id}`} className="si-tab" aria-selected={tab === t.id} aria-controls="si-panel" onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* keyed by tab so switching starts a fresh draft from the latest saved values */}
      <div id="si-panel" role="tabpanel" aria-labelledby={`si-tab-${tab}`}>
        <Active key={tab} settings={settings} onSaved={setSettings} />
      </div>
    </div>
  );
}
