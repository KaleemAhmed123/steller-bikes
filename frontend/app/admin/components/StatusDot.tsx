// A tiny coloured dot that leads a status label, so a staffer can scan a column
// of statuses by colour. Covers the fulfillment, payment and product-status
// vocabularies in one mapper; colours come from `.status-dot` in globals.css
// (the same green/amber/red the payment pills already use — no new colours).

const OK = new Set(['delivered', 'paid', 'active']);
const BAD = new Set(['delivery_failed', 'cancelled', 'failed', 'refund_required']);
const WARN = new Set([
  'confirmed', 'processing', 'packed', 'shipped', // fulfillment in-flight
  'pending', 'unpaid', // payment in-flight
  'draft', // product
]);

function tone(status: string): 'ok' | 'warn' | 'bad' | 'neutral' {
  if (OK.has(status)) return 'ok';
  if (BAD.has(status)) return 'bad';
  if (WARN.has(status)) return 'warn';
  return 'neutral'; // refunded, archived, anything unknown
}

export function StatusDot({ status }: { status: string }) {
  return <span className="status-dot" data-tone={tone(status)} aria-hidden />;
}
