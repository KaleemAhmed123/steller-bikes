import './globals.css';
import './redesign.css';
import type { Metadata } from 'next';
import { Space_Grotesk, Inter } from 'next/font/google';

// Premium type pairing: a characterful grotesk for display, clean Inter for body.
// next/font self-hosts them (no layout shift, no external request).
const display = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-display' });
const body = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body' });

export const metadata: Metadata = {
  title: 'Raju Cycles — Bicycles in Kanpur',
  description: 'Browse cycles from Raju Cycles, a bicycle shop in Kanpur, UP.',
};

// Root layout: just the HTML shell + global styles + the font variables. The
// storefront chrome lives in app/(shop)/layout.tsx and the admin chrome in
// app/admin/layout.tsx, so the two sections don't share a header.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
