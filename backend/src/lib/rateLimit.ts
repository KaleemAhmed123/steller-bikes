import type { Request, Response, NextFunction } from 'express';

// Tiny in-memory fixed-window rate limiter — no dependency, no shared store.
// Each caller IP gets a bucket that counts requests within a window; once it
// exceeds `max`, further requests get 429 until the window rolls over.
//
// ponytail: single-instance only. Buckets live in this process's memory, so two
// Render instances wouldn't share counts. Move to a shared store (Redis) ONLY if
// the API ever scales past one instance — for this shop, one instance is the plan.
//
// `req.ip` is trustworthy because index.ts sets `trust proxy`, so behind Render's
// proxy we limit on the real client IP, not the proxy's.
interface Bucket {
  count: number;
  resetAt: number; // epoch ms when this bucket's window ends
}

export function rateLimit(opts: { windowMs: number; max: number; message?: string }) {
  const message = opts.message ?? 'Too many attempts. Please wait a minute and try again.';
  const buckets = new Map<string, Bucket>();

  // Drop expired buckets periodically so an attacker rotating IPs can't grow the
  // Map without bound. unref() lets the process exit even with this timer pending.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, b] of buckets) if (b.resetAt <= now) buckets.delete(key);
  }, opts.windowMs);
  sweep.unref?.();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
      next();
      return;
    }

    bucket.count += 1;
    if (bucket.count > opts.max) {
      res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      res.status(429).json({ error: { message } });
      return;
    }
    next();
  };
}

// Two shared presets. Auth/account actions are brute-force targets, so they get a
// tight budget; checkout is legitimately called a bit more but still must not be
// spammed (each call can create a Razorpay order).
export const loginLimiter = rateLimit({
  windowMs: 15 * 60_000, // 15 minutes
  max: 10,
  message: 'Too many attempts. Please wait 15 minutes and try again.',
});

export const checkoutLimiter = rateLimit({
  windowMs: 10 * 60_000, // 10 minutes
  max: 30,
});
