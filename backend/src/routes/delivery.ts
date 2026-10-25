import { Router } from 'express';
import { deliveryFor, loadDeliveryRules, lookupPincode } from '../lib/delivery.js';
import { rateLimit } from '../lib/rateLimit.js';

export const deliveryRouter = Router();

// Each uncached call may reach India Post, so keep it from being used as a free proxy.
const limiter = rateLimit({ windowMs: 60_000, max: 40 });

// GET /api/delivery/:pin — what the checkout needs when a customer types a pincode:
// the city/state to autofill, and the delivery fee for that pincode. The fee comes from
// our own rules (instant, no third party); only city/state use the India Post lookup,
// and if that is down `lookup` says so and the customer simply types them.
deliveryRouter.get('/:pin', limiter, async (req, res, next) => {
  try {
    const pin = String(req.params.pin).trim();
    if (!/^\d{6}$/.test(pin)) {
      res.status(400).json({ error: { message: 'Enter a 6-digit PIN code.' } });
      return;
    }
    const [rules, found] = await Promise.all([loadDeliveryRules(), lookupPincode(pin)]);
    const { kanpur, fee } = deliveryFor(pin, rules);
    res.json({
      data: {
        pin,
        kanpur,
        fee, // paise; 0 outside Kanpur (an agent agrees the charge by phone)
        lookup: found.status,
        city: found.status === 'ok' ? found.city : '',
        state: found.status === 'ok' ? found.state : '',
      },
    });
  } catch (err) {
    next(err);
  }
});
