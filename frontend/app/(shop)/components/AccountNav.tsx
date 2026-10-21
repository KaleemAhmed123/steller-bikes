'use client';

import Link from 'next/link';
import { User } from 'lucide-react';
import { useAccount } from './AccountProvider';

// Header link: "Account" when signed in, "Sign in" otherwise.
export function AccountNav() {
  const { customer, loading } = useAccount();
  if (loading) return null;
  return customer ? (
    <Link href="/account" className="rc-nav-link"><User aria-hidden strokeWidth={1.75} /><span className="rc-nav-text">Account</span></Link>
  ) : (
    <Link href="/login" className="rc-nav-link"><User aria-hidden strokeWidth={1.75} /><span className="rc-nav-text">Sign in</span></Link>
  );
}
