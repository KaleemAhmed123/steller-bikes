import { Router } from 'express';
import { SettingsModel } from '../models/settings.js';

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
    res.json({ data: doc ? { ...EMPTY, ...doc } : EMPTY });
  } catch (err) {
    next(err);
  }
});
