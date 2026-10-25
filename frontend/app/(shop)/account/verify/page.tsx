'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { accountApi } from '@/lib/api';
import { useAccount } from '../../components/AccountProvider';
import { PageSkeleton } from '@/components/PageSkeleton';

function VerifyInner() {
  const token = useSearchParams().get('token') ?? '';
  const { refresh } = useAccount();
  const [status, setStatus] = useState<'working' | 'ok' | 'error'>('working');
  const [message, setMessage] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // verify the token exactly once
    ran.current = true;
    if (!token) {
      setStatus('error');
      setMessage('This verification link is missing its token.');
      return;
    }
    accountApi
      .verify(token)
      .then(async () => {
        await refresh(); // emailVerified is now true
        setStatus('ok');
      })
      .catch((err: Error) => {
        setStatus('error');
        setMessage(err.message);
      });
  }, [token, refresh]);

  if (status === 'working') return <div className="auth-card">Verifying your email…</div>;
  if (status === 'ok') {
    return (
      <div className="auth-card">
        <h1>Email verified ✓</h1>
        <p className="muted">
          Thanks! Any past orders placed with this email are now linked to your account.
        </p>
        <Link href="/account" className="btn-primary btn-block">
          Go to your account
        </Link>
      </div>
    );
  }
  return (
    <div className="auth-card">
      <h1>Verification failed</h1>
      <p className="muted">{message || 'This link is invalid or has expired.'}</p>
      <Link href="/account" className="btn-primary btn-block">
        Go to your account
      </Link>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="auth-page">
      <Suspense fallback={<div className="auth-card"><PageSkeleton rows={2} /></div>}>
        <VerifyInner />
      </Suspense>
    </div>
  );
}
