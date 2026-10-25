import { Truck, PhoneCall } from 'lucide-react';
import { moneyShort } from '@/lib/api';

// The delivery & ordering promise, written ONCE and shown wherever a shopper decides:
// product page (before Add to cart), cart, checkout, order page and footer — so nobody
// is surprised at the last step and abandons checkout.
//   - Inside Kanpur: flat "Fitted Delivery" fee (owner-editable, default ₹299).
//   - Elsewhere: charged by Delhivery distance; an agent calls about the advance, and the
//     payment link then appears under the customer's order.
//   - Every order: an agent calls to confirm it.
// Server component — no state; `fee` is the live amount from settings (paise).
export function DeliveryInfo({
  fee,
  variant = 'full',
}: {
  fee: number;
  variant?: 'full' | 'compact';
}) {
  const inKanpur = fee > 0 ? `flat ${moneyShort(fee)} Fitted Delivery` : 'free Fitted Delivery';

  if (variant === 'compact') {
    return (
      <p className="rc-delivery rc-delivery--compact">
        <Truck aria-hidden strokeWidth={1.75} />
        <span>
          <strong>Inside Kanpur: {inKanpur}.</strong> Elsewhere, delivery is charged by Delhivery distance — our agent
          will call you to confirm your order and the delivery advance.
        </span>
      </p>
    );
  }

  return (
    <section className="rc-delivery" aria-label="Delivery and payment information">
      <h2 className="rc-delivery-title">Delivery &amp; ordering</h2>
      <ul>
        <li>
          <Truck aria-hidden strokeWidth={1.75} />
          <span>
            <strong>Inside Kanpur:</strong> {inKanpur}, on every product.
          </span>
        </li>
        <li>
          <Truck aria-hidden strokeWidth={1.75} />
          <span>
            <strong>Outside Kanpur:</strong> delivery charges depend on the distance to your pincode, as per Delhivery.
            Our agent will contact you about the advance payment for delivery. The payment link will appear under your
            order in <em>Your account</em>, where you can pay it.
          </span>
        </li>
        <li>
          <PhoneCall aria-hidden strokeWidth={1.75} />
          <span>
            <strong>Every order:</strong> our agent will call you to confirm your order.
          </span>
        </li>
      </ul>
    </section>
  );
}
