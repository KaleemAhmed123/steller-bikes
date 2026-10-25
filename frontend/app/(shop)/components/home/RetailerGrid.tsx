/* eslint-disable @next/next/no-img-element */
import type { Retailer } from '@/lib/types';

// "Authorized retailers" band: the brands the shop sells, as a responsive logo grid.
// Logos come from the admin (Site content). Each sits on a white tile so coloured
// logos stay readable on the black band. A plain <img> (not next/image) so any
// https logo link works, not just our image host. Empty list → the section isn't rendered.
// auto-fit columns = 3 across on a phone, more on wider screens, no JS breakpoints.
export function RetailerGrid({ retailers }: { retailers: Retailer[] }) {
  if (retailers.length === 0) return null;
  return (
    <section className="rc-retailers" aria-labelledby="rc-retailers-title" data-reveal>
      <div className="container">
        <h2 className="rc-retailers-title" id="rc-retailers-title">
          Authorized retailers
        </h2>
        <ul className="rc-retailers-grid">
          {retailers.map((r, i) => {
            const logo = <img src={r.logo} alt={r.name} loading="lazy" />;
            return (
              <li key={`${r.name}-${i}`}>
                {r.href ? (
                  <a className="rc-retailer" href={r.href} target="_blank" rel="noopener noreferrer">
                    {logo}
                  </a>
                ) : (
                  <span className="rc-retailer">{logo}</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
