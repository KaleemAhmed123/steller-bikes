import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { StoreSettings } from '@/lib/types';
import { telHref } from '@/lib/contact';
import { paymentLabel } from '@/lib/payment';

// --- Showroom / honest store info --------------------------------------------
// Reads real shop details from store settings when present; any blank field
// keeps its honest "coming soon" placeholder. No invented data.

// Build the address line from whatever parts are filled (blank parts dropped).
function addressLine(s: StoreSettings): string {
  return [s.addressLine1, s.city, s.state, s.pin].filter(Boolean).join(', ');
}

export function Showroom({ settings }: { settings: StoreSettings }) {
  const address = addressLine(settings);
  const location = address || 'Kanpur, Uttar Pradesh';
  const { mapLink, contactPhone: phone } = settings;

  return (
    <section className="rc-section rc-section--dark" data-reveal>
      <div className="container">
        <div className="rc-showroom">
          <div>
            <span className="rc-eyebrow" style={{ '--rc-accent': '#ffffff' } as CSSProperties}>
              Visit · order · ride
            </span>
            <h2 className="rc-sec-title">A real shop in Kanpur.</h2>
            <p className="rc-sec-blurb rc-sec-blurb--light">
              Stellar Bikes is a bicycle shop in Kanpur, Uttar Pradesh. Order online, or come and see
              the range in person.
            </p>
            <Link href="/shop" className="rc-btn rc-btn--light">
              Browse all cycles
            </Link>
          </div>
          <ul className="rc-facts">
            {mapLink ? (
              // The whole row is the link (a big tap target); the gold button says so. On a phone a
              // Google Maps share link opens the Maps app. No map link set = plain text below.
              <li className="rc-fact-link">
                <a href={mapLink} target="_blank" rel="noopener noreferrer" aria-label={`${location}, open in Maps`}>
                  <span className="rc-fact-k">Location</span>
                  <span className="rc-fact-v rc-fact-v--link">
                    {location}
                    <span className="rc-map-btn">Open in Maps</span>
                  </span>
                </a>
              </li>
            ) : (
              <li>
                <span className="rc-fact-k">Location</span>
                <span className="rc-fact-v">{location}</span>
              </li>
            )}
            <li>
              <span className="rc-fact-k">Payment</span>
              <span className="rc-fact-v">{paymentLabel(settings)}</span>
            </li>
            {phone && (
              <li>
                <span className="rc-fact-k">Contact</span>
                <span className="rc-fact-v">
                  {settings.contactName} · <a className="rc-tel" href={telHref(phone)}>{phone}</a>
                </span>
              </li>
            )}
            {settings.hours && (
              <li>
                <span className="rc-fact-k">Hours</span>
                <span className="rc-fact-v">{settings.hours}</span>
              </li>
            )}
            {settings.deliveryPolicy && (
              <li>
                <span className="rc-fact-k">Delivery</span>
                <span className="rc-fact-v">{settings.deliveryPolicy}</span>
              </li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
