import { randomBytes, createHash } from 'node:crypto';

// A one-time secret for an email link (verify / password reset). The RAW token
// goes in the link we email; only its sha256 HASH is stored in the DB, so the
// stored value can't be replayed if the database leaks.
export function makeToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('hex');
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
