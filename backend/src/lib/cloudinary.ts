import { createHash } from 'node:crypto';
import process from 'node:process';

// Signed uploads to Cloudinary. The browser uploads a photo or video straight to Cloudinary (it never passes
// through this server), but only with a short-lived signature that THIS server makes, and only for signed-in
// staff. The API secret never leaves the server. The signature also fixes the allowed file formats, so the
// browser cannot change them.
// How Cloudinary checks it: https://cloudinary.com/documentation/authentication_signatures

const DEFAULT_MAX_VIDEO_MB = 50;

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  maxVideoMb: number;
}

// Read from the server's environment (CLOUDINARY_*). null = not set up, and uploads stay off.
export function cloudinaryConfig(env: NodeJS.ProcessEnv = process.env): CloudinaryConfig | null {
  const cloudName = env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret, maxVideoMb: Number(env.CLOUDINARY_MAX_VIDEO_MB) || DEFAULT_MAX_VIDEO_MB };
}

// Cloudinary's rule: sort the upload fields by name, join them as "name=value" with "&", append the API secret
// with no separator, and take the SHA-1 hex digest. `file`, `cloud_name`, `resource_type` and `api_key` are
// never part of it (callers simply don't pass them).
export function signParams(params: Record<string, string | number>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return createHash('sha1')
    .update(toSign + apiSecret)
    .digest('hex');
}

// What the admin can upload. 'image' = photos and logos; 'media' = photos or videos (hero + product videos).
export const UPLOAD_KINDS = ['image', 'media'] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];

const IMAGE_FORMATS = 'jpg,jpeg,png,webp,gif,avif,svg';
const RULES: Record<UploadKind, { resourceType: 'image' | 'auto'; allowedFormats: string }> = {
  image: { resourceType: 'image', allowedFormats: IMAGE_FORMATS },
  media: { resourceType: 'auto', allowedFormats: `${IMAGE_FORMATS},mp4,webm,mov,m4v` },
};

// Everything the browser needs for ONE upload. The signature is valid for an hour (Cloudinary's rule).
export function signUpload(kind: UploadKind, config: CloudinaryConfig, nowMs: number = Date.now()) {
  const { resourceType, allowedFormats } = RULES[kind];
  const timestamp = Math.floor(nowMs / 1000);
  return {
    cloudName: config.cloudName,
    apiKey: config.apiKey, // public by design: Cloudinary needs it to look up the secret and check the signature
    timestamp,
    allowedFormats,
    resourceType, // the address segment: .../image/upload or .../auto/upload
    signature: signParams({ allowed_formats: allowedFormats, timestamp }, config.apiSecret),
    maxVideoMb: config.maxVideoMb, // the admin refuses bigger videos before uploading
  };
}
