'use client';

import { useState } from 'react';
import Link from 'next/link';
import { accountApi } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    // Always succeeds from the user's view — the API never reveals which emails exist.
    try {
      await accountApi.forgot(email);
    } catch {
      /* ignore — still show the same confirmation */
    }
    setSent(true);
    setBusy(false);
  }

  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Check your email</h1>
          <p className="muted">
            If an account exists for <strong>{email}</strong>, we&apos;ve sent a link to reset your
            password. The link expires in 1 hour.
          </p>
          <p className="muted auth-dev-note">
            Dev note: email is mocked — the reset link is printed in the backend server console.
          </p>
          <Link href="/login" className="btn-primary btn-block">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>Reset your password</h1>
        <p className="muted">Enter your email and we&apos;ll send you a reset link.</p>
        <label className="field">
          <span className="field-label">Email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <button type="submit" className="btn-primary btn-block" disabled={busy}>
          {busy ? 'Sending…' : 'Send reset link'}
        </button>
        <div className="auth-links">
          <Link href="/login">Back to sign in</Link>
        </div>
      </form>
    </div>
  );
}
