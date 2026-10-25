import { Router } from 'express';
import { SettingsModel } from '../models/settings.js';
import { withSiteContent } from '../lib/siteContent.js';
import { loadDeliveryRules } from '../lib/delivery.js';

export const settingsRouter = Router();

// A blank store so the storefront renders (and shows its honest placeholders)
// even before any settings document has been created. Payment toggles default ON
// and the announcement off, matching the model defaults.
const EMPTY = {
  addressLine1: '',
  city: '',
  state: '',
  pin: '',
  phone: '',
  whatsapp: '',
  hours: '',
  deliveryPolicy: '',
  email: '',
  codEnabled: true,
  onlinePaymentEnabled: true,
  announcement: '',
};

// GET /api/settings — public shop details for the storefront footer/showroom,
// plus the operational flags the storefront must respect (payment toggles, banner).
settingsRouter.get('/', async (_req, res, next) => {
  try {
    const doc = await SettingsModel.findOne().lean();
    // The storefront shows the Kanpur fee in its messages, so it gets the live number
    // (the pincode list stays server-side; the browser asks /api/delivery/:pin).
    const { kanpurFee } = await loadDeliveryRules();
    res.json({ data: { ...withSiteContent(doc ? { ...EMPTY, ...doc } : EMPTY), kanpurDeliveryFee: kanpurFee } });
  } catch (err) {
    next(err);
  }
});
