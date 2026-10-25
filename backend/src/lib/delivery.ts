import { SettingsModel } from '../models/settings.js';

// Delivery rules (owner decision): inside Kanpur a flat "Fitted Delivery" fee applies
// to every product; anywhere else no fee is added at checkout — the charge depends on
// the Delhivery distance and an agent agrees it with the customer by phone, then raises
// an advance-payment link (see lib/advancePayments.ts).
//
// "Inside Kanpur" is decided by a PINCODE LIST, not by a third-party lookup: the money
// path must be deterministic and work offline. The list and the fee are editable in
// Admin → Settings; these are the defaults.

export const KANPUR_DEFAULT_PINS = Array.from({ length: 27 }, (_, i) => String(208001 + i)); // 208001–208027
export const KANPUR_DEFAULT_FEE = 29900; // paise → ₹299

export interface DeliveryRules {
  kanpurPins: string[];
  kanpurFee: number; // paise
}

export async function loadDeliveryRules(): Promise<DeliveryRules> {
  const s = await SettingsModel.findOne().lean();
  return {
    // `?.length` not `??`: an emptied list should fall back to the defaults rather than
    // silently charging nobody (the admin form refuses an empty list anyway).
    kanpurPins: s?.kanpurPincodes?.length ? s.kanpurPincodes : KANPUR_DEFAULT_PINS,
    kanpurFee: typeof s?.kanpurDeliveryFee === 'number' ? s.kanpurDeliveryFee : KANPUR_DEFAULT_FEE,
  };
}

// The fee (paise) to add for a delivery pincode, and whether it is inside Kanpur.
export function deliveryFor(pin: string, rules: DeliveryRules): { kanpur: boolean; fee: number } {
  const kanpur = rules.kanpurPins.includes(pin.trim());
  return { kanpur, fee: kanpur ? rules.kanpurFee : 0 };
}

// --- Pincode → city/state (free India Post API) --------------------------------
// Used ONLY to autofill the address form. It never decides a price. The API is free and
// unofficial, so it can be slow or down: we cap the wait, remember answers, and the
// checkout works fine without it (the customer just types city/state).

export type PincodeLookup =
  | { status: 'ok'; city: string; state: string }
  | { status: 'not_found' }
  | { status: 'unavailable' };

const DAY = 24 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; ttl: number; value: PincodeLookup }>();
const MAX_CACHE = 5000; // pincodes are a closed set (~20k), but never let this grow without bound

// One pincode can span several districts (208001 has Kanpur city AND rural Kanpur Dehat
// offices, and the API lists them in arbitrary order). Take the most common value;
// on a tie the first one listed wins.
function mostCommon(values: (string | undefined)[]): string {
  const counts = new Map<string, number>();
  for (const v of values) if (v?.trim()) counts.set(v.trim(), (counts.get(v.trim()) ?? 0) + 1);
  let best = '';
  let bestCount = 0;
  for (const [v, n] of counts) {
    if (n > bestCount) {
      best = v;
      bestCount = n;
    }
  }
  return best;
}

export function clearPincodeCache(): void {
  cache.clear();
}

export async function lookupPincode(pin: string): Promise<PincodeLookup> {
  const hit = cache.get(pin);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.value;

  let value: PincodeLookup;
  let ttl = DAY;
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${encodeURIComponent(pin)}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const json = (await res.json()) as {
      Status?: string;
      PostOffice?: { District?: string; State?: string }[] | null;
    }[];
    const offices = json?.[0]?.PostOffice ?? [];
    const city = mostCommon(offices.map((o) => o.District));
    const state = mostCommon(offices.map((o) => o.State));
    if (json?.[0]?.Status === 'Success' && city && state) {
      value = { status: 'ok', city, state };
    } else {
      value = { status: 'not_found' };
    }
  } catch {
    value = { status: 'unavailable' };
    ttl = 30_000; // retry soon, but don't hammer a struggling API
  }

  if (cache.size >= MAX_CACHE) cache.clear();
  cache.set(pin, { at: Date.now(), ttl, value });
  return value;
}
