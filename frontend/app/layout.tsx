import './globals.css';
import './redesign.css';
import type { Metadata } from 'next';
import { Space_Grotesk, Inter, EB_Garamond } from 'next/font/google';

// Editorial type pairing (ElevenLabs direction): a light serif for display, clean
// Inter for body. Space Grotesk is kept only for the cinematic 3D hero headline so
// it stays bold, not thin-serif. next/font self-hosts them (no layout shift).
const display = EB_Garamond({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-display' });
const hero = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-hero' });
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
    <html lang="en" className={`${display.variable} ${hero.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
