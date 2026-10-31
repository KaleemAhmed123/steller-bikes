# Signed Cloudinary uploads

## 1. Task
- **Name:** Replace the public "unsigned preset" photo upload with **signed uploads** made by the backend.
- **Status:** Shipped (keys are blank until the owner adds them, so uploads stay off and paste-a-link keeps working)
- **Started / last updated:** 2026-11-01

## 2. What you asked for
The About page photos are real assets. The old way (unsigned preset, with the cloud name and preset name in the website's
public code) let anyone who found them upload to the account. Recommend and build something safer and still easy.

## 3. Decisions
1. **Signed uploads (option B).** The browser still uploads straight to Cloudinary (nothing heavy passes through our
   server), but only with a signature our server makes, for signed-in staff (`products.manage`: owner + manager).
2. **Secret stays on the server.** `CLOUDINARY_CLOUD_NAME / _API_KEY / _API_SECRET` (+ optional `_MAX_VIDEO_MB`) live in
   `backend/.env` and Render. The three `NEXT_PUBLIC_CLOUDINARY_*` keys are gone from the frontend.
3. **What is signed:** `timestamp` and `allowed_formats` (images only for photos; images + video for media). No `folder`:
   Cloudinary says it only applies in legacy folder mode, and organising the library is not needed (YAGNI).
4. **Size limits** cannot be set on a Cloudinary upload request, so the 5 MB photo limit and the video cap
   (`CLOUDINARY_MAX_VIDEO_MB`, sent to the admin with the signature) are enforced in the admin, plus the Cloudinary plan's own limits.
5. **Off by default.** With the keys blank, `GET /api/admin/uploads` says `enabled:false`, the Upload buttons stay hidden/disabled,
   and a notice explains. Pasting an image link always works.

## 4. How it was built
- `backend/src/lib/cloudinary.ts` — `cloudinaryConfig`, `signParams` (SHA-1 over the sorted `name=value` fields plus the secret,
  Cloudinary's documented rule), `signUpload`. `routes/uploads.ts` — `GET /api/admin/uploads`, `POST /api/admin/uploads/sign`.
- `frontend/lib/api.ts` — `uploadToCloudinary` (sign, then upload) behind `uploadImage` / `uploadMedia`; `adminApi.uploads`.
  `useUploadsEnabled` tells every Upload button whether the server is set up. `useFileUpload` is the shared flow.
- Tests: backend `cloudinary.test.ts` (Cloudinary's two official signature examples), `uploadRoutes.test.ts`; frontend `upload.test.ts`.
- Not testable here without an account: one real upload to Cloudinary. The signature rule was checked against Cloudinary's
  documentation and its worked examples.

## 5. Checklist
- [x] Backend signing + routes + tests; frontend flow + tests; env examples and playbook updated
- [x] Empty `CLOUDINARY_*` keys added to `backend/.env.example` and to the owner's `backend/.env`
- [ ] Owner: create the Cloudinary account (two-step login on), fill the three values, restart the backend, upload one real photo
- [ ] Owner: add the same values in Render for production

## Updates log
- 2026-11-01 — Built; unsigned preset and the public keys removed.
