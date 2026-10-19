'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import type { StaffMe } from '@/lib/types';

// [href, label, ownerOnly?]
const NAV: [string, string, boolean?][] = [
  ['/admin', 'Dashboard'],
  ['/admin/orders', 'Orders'],
  ['/admin/products', 'Products'],
  ['/admin/inventory', 'Inventory'],
  ['/admin/notes', 'Notes'],
  ['/admin/settings', 'Settings', true],
];

// Guards the authenticated admin pages: checks the session, bounces to /login if
// not signed in, and renders the sidebar + sign-out around the page.
export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<StaffMe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .me()
      .then(setMe)
      .catch(() => router.replace('/admin/login'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="admin">
        <p className="muted" style={{ padding: 40 }}>
          Checking access…
        </p>
      </div>
    );
  }
  if (!me) return null;

  async function logout() {
    await adminApi.logout().catch(() => undefined);
    router.replace('/admin/login');
  }

  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));

  return (
    <div className="admin">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          Stellar Bikes <span>admin</span>
        </div>
        <nav className="admin-nav">
          {NAV.filter(([, , ownerOnly]) => !ownerOnly || me.role === 'owner').map(([href, label]) => (
            <Link key={href} href={href} className={`admin-navlink ${isActive(href) ? 'active' : ''}`}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="admin-user">
          <span className="muted">
            {me.email} · {me.role}
          </span>
          <button type="button" className="link-btn" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
