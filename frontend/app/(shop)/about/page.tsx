import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About us',
  description: 'About Stellar Bikes, Kanpur.',
};

// ponytail: placeholder page — the owner will supply the content later. Replace the
// <p> below with the real story (or wire it to Site content if it needs editing).
export default function AboutPage() {
  return (
    <div className="container" style={{ padding: '3rem 0' }}>
      <h1>About us</h1>
      <p>Our story is coming soon.</p>
    </div>
  );
}
