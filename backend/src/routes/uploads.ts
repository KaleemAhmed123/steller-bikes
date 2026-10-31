import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '../lib/auth.js';
import { UPLOAD_KINDS, cloudinaryConfig, signUpload } from '../lib/cloudinary.js';

// Mounted at /api/admin/uploads behind requireAuth. Anyone who can manage products (owner + manager) may upload.
export const uploadsRouter = Router();
uploadsRouter.use(requirePermission('products.manage'));

// GET /api/admin/uploads — is photo/video upload set up on the server? (decides whether Upload buttons show)
uploadsRouter.get('/', (_req, res) => {
  res.json({ data: { enabled: cloudinaryConfig() !== null } });
});

const signBody = z.object({ kind: z.enum(UPLOAD_KINDS) });

// POST /api/admin/uploads/sign { kind } — a signature for one upload. Never includes the API secret.
uploadsRouter.post('/sign', (req, res) => {
  const parsed = signBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { message: 'Say what you are uploading: image or media.' } });
    return;
  }
  const config = cloudinaryConfig();
  if (!config) {
    res.status(503).json({ error: { message: 'Photo upload is not set up on the server yet. Paste an image link instead.' } });
    return;
  }
  res.json({ data: signUpload(parsed.data.kind, config) });
});
