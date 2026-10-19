'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import type { Note, NoteType } from '@/lib/types';
import { useInfiniteList } from '@/lib/useInfiniteList';
import { LoadMore } from '@/components/LoadMore';

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

// Types you can tag a note to from here (general = not tied to anything).
const ADD_TYPES: [NoteType, string][] = [
  ['general', 'General (not tied to anything)'],
  ['order', 'Order'],
  ['product', 'Product'],
  ['inventory', 'Inventory variant'],
];

export default function AdminNotes() {
  const [filter, setFilter] = useState<NoteType | ''>('');
  const [body, setBody] = useState('');
  const [addType, setAddType] = useState<NoteType>('general');
  const [refId, setRefId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''); // add / delete errors (list errors come from the hook)

  const fetchPage = useCallback((page: number) => adminApi.notes.listPage(filter, page), [filter]);
  const {
    items: notes,
    setItems: setNotes,
    loading,
    error: listError,
    hasMore,
    total,
    loadMore,
    reset,
  } = useInfiniteList<Note>(fetchPage, { getId: (n) => n._id });

  // Any filter change re-seeds from page 1.
  useEffect(() => {
    reset();
  }, [reset]);

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    if (addType !== 'general' && !refId.trim()) {
      setError('Paste the id of the item this note is about (or choose General).');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await adminApi.notes.create({
        type: addType,
        refId: addType === 'general' ? undefined : refId.trim(),
        body: text,
      });
      setBody('');
      setRefId('');
      reset();
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

      <form className="notes-add" onSubmit={addNote}>
        <div className="notes-add-row">
          <select value={addType} onChange={(e) => setAddType(e.target.value as NoteType)}>
            {ADD_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {addType !== 'general' && (
            <input
              placeholder={`${addType} id`}
              value={refId}
              onChange={(e) => setRefId(e.target.value)}
            />
          )}
        </div>
        <textarea
          rows={2}
          placeholder="Write the note…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button type="submit" className="btn-primary" disabled={busy || !body.trim()}>
          {busy ? 'Saving…' : 'Add note'}
        </button>
      </form>
      <p className="muted">
        Tip: the easiest way to tag a note is the <strong>Notes</strong> button on an order, product,
        payment, or inventory row — it fills in the id for you. Here you can also paste an id directly.
      </p>

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
        !loading && !listError && <div className="empty">No notes here yet.</div>
      ) : (
        <>
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
        <LoadMore
          onLoadMore={loadMore}
          hasMore={hasMore}
          loading={loading}
          error={listError}
          count={notes.length}
          total={total}
          label="notes"
          auto={false}
        />
        </>
      )}
    </div>
  );
}
