'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { isoToIstInput, istInputToIso } from '@/lib/indiaTime';
import {
  MONTHS, WEEKDAYS, describeWallClock, formatWallClock, monthGrid, parseWallClock, shiftMonth, type WallClock,
} from '@/lib/calendar';
import './dateTimeField.css';

// A compact date + time picker in India time. A button shows the chosen moment; it opens
// a calendar (a dropdown on desktop, a bottom sheet on phones) with a time row beneath.
// Value in and out is an ISO timestamp; every pick is applied at once, "Done" just closes.
interface Props {
  labelId: string; // id of the visible label that names this field
  value: string; // ISO timestamp ('' = nothing picked yet)
  onChange: (iso: string) => void;
}

const DEFAULT_TIME = { hour: 20, minute: 0 }; // 8:00 PM when a date is picked with no time yet
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const pad2 = (n: number) => String(n).padStart(2, '0');

function nowInIndia(): WallClock {
  return parseWallClock(isoToIstInput(new Date().toISOString())) as WallClock;
}

export function DateTimeField({ labelId, value, onChange }: Props) {
  const popId = useId();
  const [open, setOpen] = useState(false);
  const picked = parseWallClock(isoToIstInput(value));
  const today = nowInIndia();
  const [view, setView] = useState({ year: (picked ?? today).year, month: (picked ?? today).month });
  const trigger = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);

  const emit = (next: WallClock) => onChange(istInputToIso(formatWallClock(next)));
  const base: WallClock = picked ?? { ...today, ...DEFAULT_TIME };

  function openPicker() {
    setView({ year: (picked ?? today).year, month: (picked ?? today).month });
    setOpen(true);
  }

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  // Escape closes; focus moves into the calendar when it opens.
  useEffect(() => {
    if (!open) return;
    popover.current?.querySelector<HTMLElement>('[aria-pressed="true"], [aria-current="date"]')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const hour12 = base.hour % 12 || 12;
  const isPm = base.hour >= 12;
  const setTime = (h12: number, pm: boolean, minute: number) => emit({ ...base, hour: (h12 % 12) + (pm ? 12 : 0), minute });

  return (
    <div className="dtf">
      <button
        ref={trigger}
        type="button"
        className="dtf-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={popId}
        aria-labelledby={labelId}
        onClick={() => (open ? close() : openPicker())}
      >
        <CalendarDays size={18} aria-hidden />
        <span>{picked ? describeWallClock(picked) : 'Pick a date and time'}</span>
      </button>

      {open && (
        <>
          <div className="dtf-backdrop" onClick={close} />
          <div ref={popover} id={popId} className="dtf-pop" role="dialog" aria-label="Choose date and time">
            <div className="dtf-head">
              <button type="button" className="dtf-nav" aria-label="Previous month" onClick={() => setView(shiftMonth(view.year, view.month, -1))}>
                <ChevronLeft size={20} aria-hidden />
              </button>
              <strong aria-live="polite">{MONTHS[view.month]} {view.year}</strong>
              <button type="button" className="dtf-nav" aria-label="Next month" onClick={() => setView(shiftMonth(view.year, view.month, 1))}>
                <ChevronRight size={20} aria-hidden />
              </button>
            </div>

            <div className="dtf-grid" role="grid">
              {WEEKDAYS.map((w) => (
                <span key={w} className="dtf-weekday" aria-hidden="true">{w.slice(0, 2)}</span>
              ))}
              {monthGrid(view.year, view.month).map((d) => {
                const isPicked = !!picked && picked.year === d.year && picked.month === d.month && picked.day === d.day;
                const isToday = today.year === d.year && today.month === d.month && today.day === d.day;
                return (
                  <button
                    key={`${d.year}-${d.month}-${d.day}`}
                    type="button"
                    className={`dtf-day${d.inMonth ? '' : ' dtf-out'}${isToday ? ' dtf-today' : ''}`}
                    aria-pressed={isPicked}
                    aria-current={isToday ? 'date' : undefined}
                    aria-label={`${d.day} ${MONTHS[d.month]} ${d.year}`}
                    onClick={() => {
                      emit({ ...base, year: d.year, month: d.month, day: d.day });
                      setView({ year: d.year, month: d.month });
                    }}
                  >
                    {d.day}
                  </button>
                );
              })}
            </div>

            <div className="dtf-time">
              <label>
                <span className="rc-sr-only">Hour</span>
                <select value={hour12} onChange={(e) => setTime(+e.target.value, isPm, base.minute)}>
                  {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </label>
              <b aria-hidden="true">:</b>
              <label>
                <span className="rc-sr-only">Minute</span>
                <select value={base.minute} onChange={(e) => setTime(hour12, isPm, +e.target.value)}>
                  {MINUTES.map((m) => <option key={m} value={m}>{pad2(m)}</option>)}
                </select>
              </label>
              <div className="dtf-ampm" role="group" aria-label="AM or PM">
                {(['AM', 'PM'] as const).map((label) => (
                  <button key={label} type="button" aria-pressed={isPm === (label === 'PM')} onClick={() => setTime(hour12, label === 'PM', base.minute)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="dtf-foot">
              <span className="muted">India time</span>
              <button type="button" className="link-btn" onClick={() => { emit({ ...base, year: today.year, month: today.month, day: today.day }); setView({ year: today.year, month: today.month }); }}>
                Today
              </button>
              <button type="button" className="btn-primary dtf-done" onClick={close}>Done</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
