'use client';

import { usePathname } from 'next/navigation';
import { AdminShell } from './AdminShell';

// The login page renders bare (no guard, or it would redirect-loop); every other
// admin page is wrapped in the guarded shell.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/admin/login') return <>{children}</>;
  return <AdminShell>{children}</AdminShell>;
}
