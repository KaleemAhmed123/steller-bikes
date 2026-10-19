import process from 'node:process';
import { z } from 'zod';

// Load .env into process.env using Node's built-in loader (no dotenv dependency needed).
// If there's no .env file yet, we silently fall back to real environment variables.
try {
  process.loadEnvFile();
} catch {
  // no .env file present — that's fine in hosted environments
}

// Validate environment variables once, at boot. If something required is missing,
// the server fails fast with a clear message instead of crashing later in a request.
const schema = z.object({
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required (see .env.example)'),
  PORT: z.coerce.number().int().positive().default(3001),
  // The frontend origin allowed to call this API from the browser (CORS).
  // Dev default is the Next.js dev server; in prod set it to the Vercel URL.
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:3000'),
  // Controls cookie security. In production the cart + session cookies must be
  // SameSite=None; Secure because the frontend (Vercel) and API (Render) are
  // different sites; in dev (both localhost) a Lax cookie works.
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  // Signs the staff session cookie. MUST be set to a long random value in
  // production; a dev default keeps local setup frictionless.
  SESSION_SECRET: z.string().min(1).default('dev-insecure-session-secret-change-me'),
  // Razorpay online payments. BOTH optional: when unset, online pay is simply
  // off and the shop runs on Cash-on-Delivery alone (like the Cloudinary keys).
  // The key id is public (the browser needs it); the secret must stay server-side.
  RAZORPAY_KEY_ID: z.string().default(''),
  RAZORPAY_KEY_SECRET: z.string().default(''),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
  console.error('Invalid environment configuration:\n' + issues.join('\n'));
  process.exit(1);
}

export const config = parsed.data;
