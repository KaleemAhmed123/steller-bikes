'use client';

import Link from 'next/link';
import { useAccount } from './AccountProvider';

// Header link: "Account" when signed in, "Sign in" otherwise.
export function AccountNav() {
  const { customer, loading } = useAccount();
  if (loading) return null;
  return customer ? (
    <Link href="/account" className="rc-nav-link">Account</Link>
  ) : (
    <Link href="/login" className="rc-nav-link">Sign in</Link>
  );
}
