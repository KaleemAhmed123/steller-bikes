'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { PageSkeleton } from '@/components/PageSkeleton';
import { PromoStrip } from '@/components/promo-strip/PromoStrip';
import { STRIPS, findStrip } from '@/components/promo-strip/strips';
import { DateTimeField } from '../components/DateTimeField';
import './promoPicker.css';

// "Promo strip" (owner-only): pick a look for the bar above the shop's navbar, type
// its text, press Apply. The text is the same `announcement` setting the Platform tab
// used to hold (blank = no strip); the look is `announcementStyle`; the countdown look
// also needs `countdownEndsAt`.
interface Draft {
  text: string;
  styleId: string;
  endsAt: string; // ISO timestamp
}

const TEXT_MAX = 120; // short text reads best on a strip; the server allows up to 300

export default function AdminPromoStrip() {
  const [live, setLive] = useState<Draft | null>(null); // what the shop shows right now
  const [draft, setDraft] = useState<Draft | null>(null); // what the owner is editing
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    adminApi.settings
      .get()
      .then((d) => {
        const loaded = { text: d.announcement ?? '', styleId: findStrip(d.announcementStyle ?? '').id, endsAt: d.countdownEndsAt ?? '' };
        setLive(loaded);
        setDraft(loaded);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  async function apply(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      // Only send the date when the owner changed it, so an untouched default is never frozen into the settings.
      const saved = await adminApi.settings.update({
        announcement: draft.text,
        announcementStyle: draft.styleId,
        ...(draft.endsAt !== live?.endsAt && { countdownEndsAt: draft.endsAt }),
      });
      const next = { text: saved.announcement, styleId: findStrip(saved.announcementStyle).id, endsAt: saved.countdownEndsAt };
      setLive(next);
      setDraft(next);
      setMessage(
        next.text
          ? 'Applied. The shop shows the new strip on the next page load.'
          : 'Applied. The text is empty, so the shop shows no strip.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not apply the strip.');
    } finally {
      setBusy(false);
    }
  }

  if (error && !draft) return <div className="notice error">{error}</div>;
  if (!draft || !live) return <PageSkeleton />;

  const dirty = draft.text !== live.text || draft.styleId !== live.styleId || draft.endsAt !== live.endsAt;
  const hasCountdown = findStrip(draft.styleId).hasCountdown;
  // One line beside the button: what went wrong, else what is still unsaved, else what just happened.
  const status = error || (dirty ? 'Unsaved changes' : message);
  // Picking a look never throws away what was typed; an empty box just gets that look's sample line.
  const pick = (styleId: string) =>
    setDraft({ ...draft, styleId, text: draft.text.trim() ? draft.text : findStrip(styleId).sampleText });

  return (
    <div>
      <h1 className="admin-h1">Promo strip</h1>
      <p className="muted">
        The animated bar above the shop’s menu. Choose a look, type the message, then press Apply. Leave the text empty
        to hide the strip.
      </p>

      <form className="admin-form" onSubmit={apply}>
        <label className="field">
          <span>Strip text</span>
          <input
            value={draft.text}
            maxLength={TEXT_MAX}
            placeholder="e.g. Diwali Dhamaka · up to 25% off on every cycle"
            onChange={(e) => setDraft({ ...draft, text: e.target.value })}
          />
        </label>

        {/* The calendar and the Apply button share a row: the button sits right where the owner finishes editing. */}
        <div className="field">
          {hasCountdown && <span id="countdown-label">Countdown ends (India time)</span>}
          <div className="promo-calendar-row">
            {hasCountdown && (
              <DateTimeField labelId="countdown-label" value={draft.endsAt} onChange={(endsAt) => setDraft({ ...draft, endsAt })} />
            )}
            <button type="submit" className="btn-primary" disabled={busy || !dirty}>
              {busy ? 'Applying…' : 'Apply to the shop'}
            </button>
            <p className={`promo-status${error ? ' promo-status-error' : ''}`} role={error ? 'alert' : 'status'}>
              {status}
            </p>
          </div>
        </div>

        <h2 className="admin-h2">Preview</h2>
        <div className="promo-preview">
          {draft.text.trim() ? (
            <PromoStrip styleId={draft.styleId} text={draft.text} countdownEndsAt={draft.endsAt} />
          ) : (
            <div className="promo-preview-empty">No text, so the shop shows no strip.</div>
          )}
          <div className="promo-preview-nav" aria-hidden="true">STELLAR</div>
        </div>

        <fieldset className="promo-styles">
          <legend className="admin-h2">Choose a look</legend>
          <div className="promo-grid">
            {STRIPS.map((s) => (
              <label key={s.id} className={`promo-card ${draft.styleId === s.id ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="strip-style"
                  className="rc-sr-only"
                  checked={draft.styleId === s.id}
                  onChange={() => pick(s.id)}
                />
                <PromoStrip styleId={s.id} text={draft.text.trim() || s.sampleText} countdownEndsAt={draft.endsAt} />
                <span className="promo-card-name">{s.name}</span>
                <span className="promo-card-desc muted">{s.description}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </form>
    </div>
  );
}
