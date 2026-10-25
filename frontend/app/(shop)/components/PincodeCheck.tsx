'use client';

import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { getDelivery, money } from '@/lib/api';
import type { DeliveryQuote } from '@/lib/types';

// "Will you deliver to me, and what will it cost?" — answered on the product page, before
// anyone adds to cart, so the delivery charge is never a surprise at checkout. Same server
// answer the checkout uses (GET /api/delivery/:pin), so the two can never disagree.
export function PincodeCheck() {
  const [pin, setPin] = useState('');
  const [quote, setQuote] = useState<DeliveryQuote | null>(null);
  const [busy, setBusy] = useState(false);
  const valid = /^\d{6}$/.test(pin);

  useEffect(() => {
    if (!valid) {
      setQuote(null);
      setBusy(false);
      return;
    }
    const ctl = new AbortController();
    setBusy(true);
    getDelivery(pin, ctl.signal).then((q) => {
      if (ctl.signal.aborted) return;
      setQuote(q);
      setBusy(false);
    });
    return () => ctl.abort();
  }, [pin, valid]);

  return (
    <div className="rc-pincheck">
      <label className="rc-pincheck-label" htmlFor="pincheck">
        <MapPin aria-hidden strokeWidth={1.75} /> Check delivery to your pincode
      </label>
      <input
        id="pincheck"
        inputMode="numeric"
        maxLength={6}
        autoComplete="postal-code"
        placeholder="6-digit PIN code"
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
      />
      <p className="rc-pincheck-result" aria-live="polite">
        {busy && 'Checking…'}
        {!busy && valid && !quote && 'Couldn’t check just now. Delivery is confirmed at checkout.'}
        {!busy && quote?.lookup === 'not_found' && !quote.kanpur && 'We couldn’t find that pincode — please check it.'}
        {!busy && quote?.kanpur && (
          <>
            <strong>✓ Kanpur — flat {money(quote.fee)} Fitted Delivery.</strong>
          </>
        )}
        {!busy && quote && !quote.kanpur && quote.lookup !== 'not_found' && (
          <>
            <strong>{quote.city ? `Delivering to ${quote.city}.` : 'We deliver there.'}</strong> The charge depends on the
            Delhivery distance — our agent will call you to confirm your order and agree the delivery advance.
          </>
        )}
      </p>
    </div>
  );
}
