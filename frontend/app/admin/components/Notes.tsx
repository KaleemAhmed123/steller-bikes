'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import type { Note, NoteType } from '@/lib/types';

// Reusable notes panel for ONE target (an order / product / inventory variant).
// Lists existing notes, adds new ones, deletes (the server enforces author-or-owner).
export function Notes({ type, refId }: { type: Exclude<NoteType, 'general'>; refId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    adminApi.notes
      .list(type, refId)
      .then(setNotes)
      .catch((e: Error) => setError(e.message));
  }, [type, refId]);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    setError('');
    try {
      await adminApi.notes.create({ type, refId, body: text });
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
    <div className="notes">
      <h3 className="notes-title">Notes</h3>
      <form className="notes-add" onSubmit={add}>
        <textarea
          rows={2}
          placeholder="Add a note…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button type="submit" className="btn-primary" disabled={busy || !body.trim()}>
          {busy ? 'Saving…' : 'Add note'}
        </button>
      </form>
      {error && <div className="notice error">{error}</div>}
      {notes.length === 0 ? (
        <p className="muted">No notes yet.</p>
      ) : (
        <ul className="notes-list">
          {notes.map((n) => (
            <li key={n._id} className="note-item">
              <p className="note-body">{n.body}</p>
              <div className="note-meta">
                <span className="muted">
                  {n.author} · {new Date(n.createdAt).toLocaleString()}
                </span>
                <button type="button" className="link-btn" onClick={() => remove(n._id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
