import { Router } from 'express';
import { SettingsModel } from '../models/settings.js';

export const settingsRouter = Router();

// A blank store so the storefront renders (and shows its honest placeholders)
// even before any settings document has been created.
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
};

// GET /api/settings — public shop details for the storefront footer/showroom.
settingsRouter.get('/', async (_req, res, next) => {
  try {
    const doc = await SettingsModel.findOne().lean();
    res.json({ data: doc ?? EMPTY });
  } catch (err) {
    next(err);
  }
});
