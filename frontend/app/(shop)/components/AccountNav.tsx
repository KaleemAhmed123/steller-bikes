'use client';

import Link from 'next/link';
import { useAccount } from './AccountProvider';

// Header link: "Account" when signed in, "Sign in" otherwise.
export function AccountNav() {
  const { customer, loading } = useAccount();
  if (loading) return null;
  return customer ? <Link href="/account">Account</Link> : <Link href="/login">Sign in</Link>;
}
