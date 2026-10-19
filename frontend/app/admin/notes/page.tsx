'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import type { Note, NoteType } from '@/lib/types';

// Filter chips: label + the type to query ('' = all).
const FILTERS: [string, NoteType | ''][] = [
  ['All', ''],
  ['General', 'general'],
  ['Orders', 'order'],
  ['Products', 'product'],
  ['Inventory', 'inventory'],
];

// Where a tagged note links back to (inventory has no per-variant page → the list).
function linkFor(n: Note): string | null {
  if (n.targetType === 'order' && n.targetId) return `/admin/orders/${n.targetId}`;
  if (n.targetType === 'product' && n.targetId) return `/admin/products/${n.targetId}`;
  if (n.targetType === 'inventory') return '/admin/inventory';
  return null;
}

export default function AdminNotes() {
  const [filter, setFilter] = useState<NoteType | ''>('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    adminApi.notes
      .list(filter)
      .then(setNotes)
      .catch((e: Error) => setError(e.message));
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function addGeneral(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    setError('');
    try {
      await adminApi.notes.create({ type: 'general', body: text });
      setBody('');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the note');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setError('');
    try {
      await adminApi.notes.remove(id);
      setNotes((n) => n.filter((x) => x._id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the note');
    }
  }

  return (
    <div>
      <h1 className="admin-h1">Notes</h1>

      <form className="notes-add" onSubmit={addGeneral}>
        <textarea
          rows={2}
          placeholder="Add a general note (not tied to anything)…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button type="submit" className="btn-primary" disabled={busy || !body.trim()}>
          {busy ? 'Saving…' : 'Add note'}
        </button>
      </form>
      <p className="muted">Tagged notes are added from an order, product, or inventory item.</p>

      <div className="notes-filters">
        {FILTERS.map(([label, value]) => (
          <button
            key={label}
            type="button"
            className={`chip ${filter === value ? 'active' : ''}`}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <div className="notice error">{error}</div>}

      {notes.length === 0 ? (
        <div className="empty">No notes here yet.</div>
      ) : (
        <ul className="notes-list">
          {notes.map((n) => {
            const href = linkFor(n);
            return (
              <li key={n._id} className="note-item">
                <p className="note-body">{n.body}</p>
                <div className="note-meta">
                  <span className="muted">
                    <span className="note-tag">{n.targetType}</span>
                    {href && (
                      <>
                        {' '}
                        <Link href={href}>view →</Link>
                      </>
                    )}
                    {' · '}
                    {n.author} · {new Date(n.createdAt).toLocaleString()}
                  </span>
                  <button type="button" className="link-btn" onClick={() => remove(n._id)}>
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
