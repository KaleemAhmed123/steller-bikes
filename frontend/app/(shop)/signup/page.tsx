'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { accountApi } from '@/lib/api';
import { useAccount } from '../components/AccountProvider';
import { useCart } from '../components/CartProvider';

export default function SignupPage() {
  const router = useRouter();
  const { setCustomer } = useAccount();
  const { refresh: refreshCart } = useCart();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const customer = await accountApi.signup(form);
      setCustomer(customer);
      await refreshCart(); // guest cart merged into the new account server-side
      router.replace('/account');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>Create your account</h1>
        <label className="field">
          <span className="field-label">Full name</span>
          <input required value={form.name} onChange={set('name')} />
        </label>
        <label className="field">
          <span className="field-label">Email</span>
          <input type="email" required value={form.email} onChange={set('email')} />
        </label>
        <label className="field">
          <span className="field-label">Password (min 8 characters)</span>
          <input type="password" required minLength={8} value={form.password} onChange={set('password')} />
        </label>
        {error && <div className="notice error">{error}</div>}
        <button type="submit" className="btn-primary btn-block" disabled={busy}>
          {busy ? 'Creating…' : 'Create account'}
        </button>
        <div className="auth-links">
          <span>
            Already have an account? <Link href="/login">Sign in</Link>
          </span>
        </div>
      </form>
    </div>
  );
}
