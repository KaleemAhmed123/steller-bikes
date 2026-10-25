'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  Bike,
  Boxes,
  StickyNote,
  CreditCard,
  Settings,
  SlidersHorizontal,
  LayoutTemplate,
  Menu,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import type { StaffMe } from '@/lib/types';

const NAV: { href: string; label: string; icon: LucideIcon; ownerOnly?: boolean }[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/admin/products', label: 'Products', icon: Bike },
  { href: '/admin/inventory', label: 'Inventory', icon: Boxes },
  { href: '/admin/notes', label: 'Notes', icon: StickyNote },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard, ownerOnly: true },
  { href: '/admin/settings', label: 'Settings', icon: Settings, ownerOnly: true },
  { href: '/admin/platform', label: 'Platform', icon: SlidersHorizontal, ownerOnly: true },
  { href: '/admin/content', label: 'Site content', icon: LayoutTemplate, ownerOnly: true },
];

// Guards the authenticated admin pages: checks the session, bounces to /login if
// not signed in, and renders the sidebar + sign-out around the page.
export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<StaffMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [navOpen, setNavOpen] = useState(false); // mobile drawer

  useEffect(() => {
    adminApi
      .me()
      .then(setMe)
      .catch(() => router.replace('/admin/login'))
      .finally(() => setLoading(false));
  }, [router]);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

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
      <a href="#admin-main" className="skip-link">Skip to main content</a>
      <div className="admin-topbar">
        <button
          type="button"
          className="admin-hamburger"
          aria-label="Open menu"
          onClick={() => setNavOpen(true)}
        >
          <Menu size={22} aria-hidden />
        </button>
        <div className="admin-brand">
          Stellar Bikes <span>admin</span>
        </div>
      </div>

      {navOpen && <div className="admin-backdrop" onClick={() => setNavOpen(false)} />}

      <aside className={`admin-sidebar ${navOpen ? 'open' : ''}`}>
        <div className="admin-brand">
          Stellar Bikes <span>admin</span>
        </div>
        <nav className="admin-nav">
          {NAV.filter((item) => !item.ownerOnly || me.role === 'owner').map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`admin-navlink ${isActive(href) ? 'active' : ''}`}
              onClick={() => setNavOpen(false)}
            >
              <Icon aria-hidden strokeWidth={1.75} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="admin-user">
          <span className="muted">
            {me.email} · {me.role}
          </span>
          <button type="button" className="link-btn" onClick={logout}>
            <LogOut aria-hidden strokeWidth={1.75} />
            Sign out
          </button>
        </div>
      </aside>
      <main id="admin-main" className="admin-main">{children}</main>
    </div>
  );
}
