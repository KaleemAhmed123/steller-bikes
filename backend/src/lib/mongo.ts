// Small shared helpers for talking to MongoDB safely. One home so the duplicate-
// key check and the regex escaper aren't re-typed (and drifting) across routes.

// MongoDB signals a unique-index violation with error code 11000. Callers use it
// to turn a racing/duplicate insert into a graceful response instead of a 500.
export function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}

// Escape regex-special characters so user search text is matched literally (e.g.
// "29." doesn't become a wildcard). Prevents both regex errors and injection when
// the text is turned into a `new RegExp(...)` for a Mongo query.
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
