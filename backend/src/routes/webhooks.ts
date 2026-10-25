import { Router } from 'express';
import { config } from '../config.js';
import { applyLinkSnapshot, type LinkSnapshot } from '../lib/advancePayments.js';
import { verifyWebhookSignature } from '../lib/razorpay.js';
import { logger } from '../lib/log.js';

const log = logger('webhook');

// Razorpay calls this by itself when a payment link is paid / cancelled / expires —
// even if the customer closed their browser right after paying. That is what makes a
// "money left their account but the page never told us" case fix itself.
//
// index.ts mounts this behind express.raw(), so req.body is the EXACT bytes Razorpay
// signed (re-serialised JSON would never match the signature).
export const webhooksRouter = Router();

type Entity = { id?: string; status?: string; amount_paid?: number };
type Payload = {
  event?: string;
  payload?: {
    payment_link?: { entity?: Entity };
    payment?: { entity?: { id?: string; method?: string } };
  };
};

webhooksRouter.post('/razorpay', async (req, res, next) => {
  try {
    const raw = req.body as Buffer;
    const signature = String(req.get('x-razorpay-signature') ?? '');
    if (!verifyWebhookSignature(raw, signature, config.RAZORPAY_WEBHOOK_SECRET)) {
      log.warn('rejected: bad or missing signature');
      res.status(401).json({ error: { message: 'Bad signature.' } });
      return;
    }

    let body: Payload;
    try {
      body = JSON.parse(raw.toString('utf8')) as Payload;
    } catch {
      res.status(400).json({ error: { message: 'Bad body.' } });
      return;
    }

    const link = body.payload?.payment_link?.entity;
    if (body.event?.startsWith('payment_link.') && link?.id) {
      const pay = body.payload?.payment?.entity;
      const snap: LinkSnapshot = {
        id: link.id,
        status: link.status ?? '',
        amountPaid: link.amount_paid ?? 0,
        paymentId: pay?.id,
        method: pay?.method,
      };
      const applied = await applyLinkSnapshot(snap);
      log.info('event', { event: body.event, linkId: link.id, applied: applied?.status ?? 'no change' });
    }
    // 200 for anything validly signed — including events we don't care about — so
    // Razorpay stops retrying. A thrown error (DB down) returns 500 and it retries.
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
