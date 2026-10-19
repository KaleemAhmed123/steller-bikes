import express from 'express';
import cors from 'cors';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import { config } from './config.js';
import { connectDb } from './db.js';
import { productsRouter } from './routes/products.js';
import { settingsRouter } from './routes/settings.js';
import { cartRouter } from './routes/cart.js';
import { checkoutRouter } from './routes/checkout.js';
import { ordersRouter } from './routes/orders.js';
import { authRouter } from './routes/auth.js';
import { adminRouter } from './routes/admin.js';
import { accountRouter } from './routes/account.js';
import { notesRouter } from './routes/notes.js';
import { guestCart } from './lib/guest.js';
import { requireAuth } from './lib/auth.js';

const app = express();
// Behind Render's proxy in production, so Secure cookies are recognised.
app.set('trust proxy', 1);
// Allow the frontend (a different origin on Vercel/localhost:3000) to call this API.
// credentials:true lets the browser send/receive the cart + session cookies cross-origin.
app.use(cors({ origin: config.FRONTEND_ORIGIN, credentials: true }));
app.use(express.json());

const prod = config.NODE_ENV === 'production';
// Staff session, stored in MongoDB so it survives Render restarts/sleeps.
// saveUninitialized:false → storefront visitors get no session cookie, only staff who log in.
app.use(
  session({
    name: 'rc_admin',
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: config.MONGODB_URI, dbName: 'raju-cycles', collectionName: 'sessions' }),
    cookie: {
      httpOnly: true,
      sameSite: prod ? 'none' : 'lax',
      secure: prod,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  }),
);

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/products', productsRouter);
app.use('/api/settings', settingsRouter);
// The cart, checkout and orders are keyed to a per-browser guest cookie.
app.use('/api/cart', guestCart, cartRouter);
app.use('/api/checkout', guestCart, checkoutRouter);
app.use('/api/orders', guestCart, ordersRouter);
// Customer accounts (signup/login/me/verify/reset/addresses). guestCart runs
// first so signup/login can merge the guest cart into the new account.
app.use('/api/account', guestCart, accountRouter);
// Staff auth + the permission-gated admin.
app.use('/api/auth', authRouter);
// Notes mount before the general admin mount so /api/admin/notes resolves here.
app.use('/api/admin/notes', requireAuth, notesRouter);
app.use('/api/admin', requireAuth, adminRouter);

// Last-resort error handler: log the real error, return a safe generic message.
app.use(
  (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: { message: 'Something went wrong. Please try again.' } });
  },
);

async function start(): Promise<void> {
  await connectDb();
  const server = app.listen(config.PORT, () => {
    console.log(`API listening on http://localhost:${config.PORT}`);
  });
  // Hold idle keep-alive sockets longer than any browser would, so the server
  // never closes a connection the browser is about to reuse. Without this, Node
  // drops idle sockets after 5s and Chrome's pre-opened connection gets reset on
  // the first request → net::ERR_CONNECTION_RESET (then the retry succeeds).
  // headersTimeout must stay > keepAliveTimeout or Node warns.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
