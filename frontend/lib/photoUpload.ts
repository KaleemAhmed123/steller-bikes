import { uploadImage } from '@/lib/api';

// Rules for photos the owner uploads (About page). The checks run in the browser BEFORE
// anything is sent, so a wrong file gets a plain-English message instead of a failed upload.
export const MAX_PHOTO_MB = 5;
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface PhotoSpec {
  ratio: string; // "4:3"
  best: { w: number; h: number }; // recommended size
  min: { w: number; h: number }; // smaller than this looks blurry
  note?: string; // extra advice, e.g. which edges get trimmed
}

// "Best 1200 × 900 px (4:3). At least 800 × 600 px. JPG, PNG or WebP, under 5 MB."
export function specText({ ratio, best, min, note }: PhotoSpec): string {
  return `Best ${best.w} × ${best.h} px (${ratio}). At least ${min.w} × ${min.h} px. JPG, PNG or WebP, under ${MAX_PHOTO_MB} MB.${note ? ` ${note}` : ''}`;
}

// Validate, upload, and say whether the photo is smaller than recommended (not an error: it still works).
export async function uploadPhoto(file: File, min: PhotoSpec['min']): Promise<{ url: string; warning: string }> {
  if (!PHOTO_TYPES.includes(file.type)) throw new Error('Choose a JPG, PNG or WebP photo.');
  if (file.size > MAX_PHOTO_MB * 1024 * 1024) throw new Error(`That photo is over ${MAX_PHOTO_MB} MB. Choose a smaller one.`);

  const size = await createImageBitmap(file)
    .then((bitmap) => {
      const s = { w: bitmap.width, h: bitmap.height };
      bitmap.close();
      return s;
    })
    .catch(() => null); // unreadable here: let the upload decide
  const url = await uploadImage(file);
  const small = size && (size.w < min.w || size.h < min.h);
  return { url, warning: small ? `This photo is ${size.w} × ${size.h} px, smaller than recommended, so it may look blurry.` : '' };
}
