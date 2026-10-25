// Image-source safety. Product photos are meant to be local files under
// public/images or Cloudinary uploads (see next.config.ts). A product saved
// with any other URL (e.g. a Pinterest *page* link) would make next/image throw
// and take the whole route down. These helpers keep a bad src from ever
// reaching the renderer, falling back to a neutral local placeholder.

export const PLACEHOLDER = '/images/placeholder.svg';

// Hosts next/image is allowed to optimise — must mirror next.config.ts.
const ALLOWED_HOSTS = ['res.cloudinary.com'];

// Returns a src that is safe to hand to next/image or <img>: a local path, an
// allowed remote host, otherwise the placeholder. Empty/garbage → placeholder.
export function safeSrc(src: string | null | undefined): string {
  if (!src) return PLACEHOLDER;
  const s = src.trim();
  if (s.startsWith('/')) return s; // local public/ asset
  try {
    const url = new URL(s);
    if (url.protocol === 'https:' && ALLOWED_HOSTS.includes(url.hostname)) return s;
  } catch {
    // not a valid absolute URL (and not a local path) → placeholder
  }
  return PLACEHOLDER;
}

// Same idea for <video>: a local path or an https Cloudinary link, otherwise null
// (the caller skips the item — there is no video placeholder to fall back to).
export function safeVideoSrc(src: string | null | undefined): string | null {
  const s = (src ?? '').trim();
  if (s.startsWith('/')) return s;
  try {
    const url = new URL(s);
    if (url.protocol === 'https:' && ALLOWED_HOSTS.includes(url.hostname)) return s;
  } catch {
    // not a valid absolute URL → refuse
  }
  return null;
}

// onError handler for plain <img>: swap to the placeholder once (the data-fb
// guard stops an infinite loop if the placeholder itself were ever missing).
export function imgError(e: React.SyntheticEvent<HTMLImageElement>) {
  const el = e.currentTarget;
  if (el.dataset.fb) return;
  el.dataset.fb = '1';
  el.src = PLACEHOLDER;
}
