'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { accountApi } from '@/lib/api';

function ResetForm() {
  const token = useSearchParams().get('token') ?? '';
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await accountApi.reset(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="auth-card">
        <h1>Invalid link</h1>
        <p className="muted">This reset link is missing its token. Request a new one.</p>
        <Link href="/forgot-password" className="btn-primary btn-block">
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="auth-card">
        <h1>Password updated</h1>
        <p className="muted">You can now sign in with your new password.</p>
        <Link href="/login" className="btn-primary btn-block">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form className="auth-card" onSubmit={onSubmit}>
      <h1>Choose a new password</h1>
      <label className="field">
        <span className="field-label">New password (min 8 characters)</span>
        <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      {error && <div className="notice error">{error}</div>}
      <button type="submit" className="btn-primary btn-block" disabled={busy}>
        {busy ? 'Saving…' : 'Update password'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="auth-page">
      <Suspense fallback={<div className="auth-card">Loading…</div>}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
