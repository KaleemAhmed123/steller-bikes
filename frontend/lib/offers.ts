// "new-year" → "New Year". Offer types are stored as kebab-case keys; this is the
// one place that turns a key into the label shown on cards, tags and filters.
export function offerLabel(key: string): string {
  return key
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}
