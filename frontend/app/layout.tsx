import './globals.css';
import './redesign.css';
import type { Metadata } from 'next';
import { Montserrat, Krona_One } from 'next/font/google';

// Brand type system (client PRD): Montserrat for body (400), sub-headings, buttons
// and accents (700); Krona One — a free, wide, heavy look-alike for the paid
// "Horizon" logo font — for display headings. next/font self-hosts both (no layout shift).
const montserrat = Montserrat({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-montserrat' });
const heading = Krona_One({ subsets: ['latin'], weight: '400', variable: '--font-krona' });

export const metadata: Metadata = {
  title: 'Stellar Bikes — Quality Bicycles & Expert Service in Kanpur',
  description:
    'Stellar Bikes is a trusted bicycle shop in Kanpur, Uttar Pradesh — quality cycles for every rider, honest prices, and dependable after-sales service. Order online with cash on delivery.',
};

// Root layout: just the HTML shell + global styles + the font variables. The
// storefront chrome lives in app/(shop)/layout.tsx and the admin chrome in
// app/admin/layout.tsx, so the two sections don't share a header.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${montserrat.variable} ${heading.variable}`}>
      <body>{children}</body>
    </html>
  );
}
