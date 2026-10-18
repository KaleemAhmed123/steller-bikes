'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { accountApi } from '@/lib/api';
import { useAccount } from '../components/AccountProvider';
import { useCart } from '../components/CartProvider';

export default function LoginPage() {
  const router = useRouter();
  const { setCustomer } = useAccount();
  const { refresh: refreshCart } = useCart();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const customer = await accountApi.login(email, password);
      setCustomer(customer);
      await refreshCart(); // the guest cart was merged into the account server-side
      router.replace('/account');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>Sign in</h1>
        <label className="field">
          <span className="field-label">Email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">Password</span>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <div className="notice error">{error}</div>}
        <button type="submit" className="btn-primary btn-block" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <div className="auth-links">
          <Link href="/forgot-password">Forgot password?</Link>
          <span>
            New here? <Link href="/signup">Create an account</Link>
          </span>
        </div>
      </form>
    </div>
  );
}
