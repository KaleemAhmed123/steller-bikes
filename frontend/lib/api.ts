import type {
  Address,
  CartView,
  Customer,
  DashboardData,
  InventoryData,
  Note,
  NoteType,
  Order,
  OrderDetail,
  PageMeta,
  PaymentDetail,
  Product,
  ProductInput,
  SavedAddress,
  StaffMe,
  StoreSettings,
  AdminCategory,
  AdminOfferType,
} from './types';

// The Express API base URL. Public (not a secret) so it works in both the
// server-render and the browser. Falls back to local dev if unset.
const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type ListResult = { products: Product[]; categories: string[]; offerTypes: string[]; pagination: PageMeta };

// Which URL search params we forward to the API. `sort` is now applied server-side
// (so paging is globally correct), alongside the catalogue filters.
const FILTER_KEYS = ['category', 'offerType', 'q', 'minPrice', 'maxPrice', 'sort'] as const;

// Fetch one page of the (optionally filtered + sorted) catalogue + the category list.
// cache:'no-store' = always fresh, so stock/price are never stale. `opts.page` is
// 1-based; omit `limit` to take the server default (24). The returned `pagination`
// drives infinite scroll.
export async function getProducts(
  searchParams: Record<string, string | string[] | undefined>,
  opts?: { page?: number; limit?: number },
): Promise<ListResult> {
  const qs = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = searchParams[key];
    if (typeof value === 'string' && value) qs.set(key, value);
  }
  if (opts?.page) qs.set('page', String(opts.page));
  if (opts?.limit) qs.set('limit', String(opts.limit));

  const res = await fetch(`${BASE}/api/products?${qs.toString()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load products');

  const json = await res.json();
  return {
    products: (json.data ?? []) as Product[],
    categories: (json.categories ?? []) as string[],
    offerTypes: (json.offerTypes ?? []) as string[],
    pagination: json.pagination as PageMeta,
  };
}

// Fetch one product by slug. Returns null on 404 so the page can show not-found.
export async function getProduct(slug: string): Promise<Product | null> {
  const res = await fetch(`${BASE}/api/products/${encodeURIComponent(slug)}`, {
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to load product');

  const json = await res.json();
  return json.data as Product;
}

// Blank store, used when the API is unreachable (and as the admin forms' initial
// state). Site-content copy is NOT repeated here — the API merges the real defaults;
// blank fields simply hide their line, the offer rail stays off.
export const EMPTY_SETTINGS: StoreSettings = {
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
  hero: {
    statValue: '',
    statLabel: '',
    tagline: '',
    ctaLabel: '',
    ctaHref: '',
    promoTitle: '',
    promoSubtitle: '',
    promoHref: '',
  },
  offerSection: { enabled: false, title: '', subtitle: '', offerTypes: [] },
  retailers: [],
};

// Public shop details for the footer/showroom. Never throws — falls back to the
// empty store (honest "coming soon" placeholders) if the API is unreachable.
export async function getSettings(): Promise<StoreSettings> {
  try {
    const res = await fetch(`${BASE}/api/settings`, { cache: 'no-store' });
    if (!res.ok) return EMPTY_SETTINGS;
    const json = await res.json();
    return { ...EMPTY_SETTINGS, ...(json.data ?? {}) } as StoreSettings;
  } catch {
    return EMPTY_SETTINGS;
  }
}

// --- Cart (browser-only calls) ---------------------------------------------
// credentials:'include' sends the guest cart cookie across origins. The browser
// also stores the Set-Cookie the API returns for a new guest.

async function cartRequest(path: string, init?: RequestInit): Promise<CartView> {
  const res = await fetch(`${BASE}/api/cart${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message ?? 'Cart request failed');
  return json.data as CartView;
}

export function getCart(): Promise<CartView> {
  return cartRequest('');
}

export function addToCart(variantId: string, quantity = 1): Promise<CartView> {
  return cartRequest('/items', {
    method: 'POST',
    body: JSON.stringify({ variantId, quantity }),
  });
}

export function updateCartItem(variantId: string, quantity: number): Promise<CartView> {
  return cartRequest(`/items/${variantId}`, {
    method: 'PATCH',
    body: JSON.stringify({ quantity }),
  });
}

export function removeCartItem(variantId: string): Promise<CartView> {
  return cartRequest(`/items/${variantId}`, { method: 'DELETE' });
}

// --- Checkout / orders (browser-only, cookie-scoped) ------------------------

export async function checkout(payload: {
  email: string;
  address: Address;
  idempotencyKey: string;
}): Promise<{ orderId: string }> {
  const res = await fetch(`${BASE}/api/checkout`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message ?? 'Checkout failed');
  return json.data as { orderId: string };
}

// --- Razorpay online payment (browser-only, cookie-scoped) ------------------
// Two steps: create a payment order (server sets the amount), then verify what
// Razorpay hands back. The server decrements stock + creates the PAID order only
// after verify succeeds.

export async function createRazorpayOrder(): Promise<{
  razorpayOrderId: string;
  amount: number;
  keyId: string;
}> {
  const res = await fetch(`${BASE}/api/checkout/razorpay/order`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message ?? 'Could not start online payment');
  return json.data as { razorpayOrderId: string; amount: number; keyId: string };
}

export async function verifyRazorpayPayment(payload: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  email: string;
  address: Address;
}): Promise<{ orderId: string; refundRequired: boolean }> {
  const res = await fetch(`${BASE}/api/checkout/razorpay/verify`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message ?? 'Payment verification failed');
  return json.data as { orderId: string; refundRequired: boolean };
}

export async function getOrder(id: string): Promise<Order> {
  const res = await fetch(`${BASE}/api/orders/${id}`, { credentials: 'include' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message ?? 'Order not found');
  return json.data as Order;
}

// One page of this browser's order history (logged-in customer). 1-based page.
export function getOrdersPage(page = 1): Promise<Page<Order>> {
  return apiFetchPage<Order>(`/api/orders?page=${page}&limit=20`);
}

// True when online payment is offered (controls the "Pay online" option). A pure
// UI flag — the authoritative key id comes back from createRazorpayOrder, and the
// secret only ever lives on the server. Mirrors uploadConfigured().
export function razorpayEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);
}

// --- Authenticated calls (browser-only, session-cookie) ---------------------
// One helper for every call that rides the session cookie — admin and customer.

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message ?? 'Request failed');
  return json.data as T;
}

// One page of a cookie-scoped list endpoint: keeps the `data` array AND the
// `pagination` block (unlike apiFetch, which returns only `data`). Used by the
// account history + admin tables for infinite scroll / "Load more".
export type Page<T> = { data: T[]; pagination: PageMeta };

async function apiFetchPage<T>(path: string): Promise<Page<T>> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message ?? 'Request failed');
  return { data: (json.data ?? []) as T[], pagination: json.pagination as PageMeta };
}

export const adminApi = {
  login: (email: string, password: string) =>
    apiFetch<StaffMe>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => apiFetch<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  me: () => apiFetch<StaffMe>('/api/auth/me'),
  dashboard: (range = '30d') => apiFetch<DashboardData>(`/api/admin/dashboard?range=${encodeURIComponent(range)}`),
  orders: (status: string, q: string, page = 1) =>
    apiFetchPage<Order>(
      `/api/admin/orders?status=${encodeURIComponent(status)}&q=${encodeURIComponent(q)}&page=${page}&limit=20`,
    ),
  order: (id: string) => apiFetch<OrderDetail>(`/api/admin/orders/${id}`),
  transition: (id: string, status: string, tracking: string) =>
    apiFetch<OrderDetail>(`/api/admin/orders/${id}/transition`, {
      method: 'POST',
      body: JSON.stringify({ status, tracking }),
    }),
  inventory: () => apiFetch<InventoryData>('/api/admin/inventory'),
  adjust: (variantId: string, delta: number, reason: string) =>
    apiFetch<InventoryData>('/api/admin/inventory/adjust', {
      method: 'POST',
      body: JSON.stringify({ variantId, delta, reason }),
    }),
  // Products — full CRUD (owner + manager).
  products: {
    list: (q = '', page = 1) =>
      apiFetchPage<Product>(`/api/admin/products?q=${encodeURIComponent(q)}&page=${page}&limit=20`),
    get: (id: string) => apiFetch<Product>(`/api/admin/products/${id}`),
    create: (body: ProductInput) =>
      apiFetch<Product>('/api/admin/products', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: Partial<ProductInput>) =>
      apiFetch<Product>(`/api/admin/products/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    remove: (id: string) =>
      apiFetch<{ ok: boolean }>(`/api/admin/products/${id}`, { method: 'DELETE' }),
  },
  // Store settings — read: owner only; PATCH: owner only.
  settings: {
    get: () => apiFetch<Partial<StoreSettings>>('/api/admin/settings'),
    update: (body: Partial<StoreSettings>) =>
      apiFetch<StoreSettings>('/api/admin/settings', { method: 'PATCH', body: JSON.stringify(body) }),
  },
  // Categories — list is readable by managers (the product form's dropdown);
  // add/rename/delete are owner only (enforced server-side).
  categories: {
    list: () => apiFetch<AdminCategory[]>('/api/admin/categories'),
    add: (name: string) =>
      apiFetch<AdminCategory[]>('/api/admin/categories', { method: 'POST', body: JSON.stringify({ name }) }),
    rename: (from: string, to: string) =>
      apiFetch<AdminCategory[]>('/api/admin/categories', { method: 'PATCH', body: JSON.stringify({ from, to }) }),
    remove: (name: string) =>
      apiFetch<AdminCategory[]>(`/api/admin/categories/${encodeURIComponent(name)}`, { method: 'DELETE' }),
  },
  // Offer types — list readable by managers (product form checkboxes); add/delete owner only.
  offerTypes: {
    list: () => apiFetch<AdminOfferType[]>('/api/admin/offer-types'),
    add: (name: string) =>
      apiFetch<AdminOfferType[]>('/api/admin/offer-types', { method: 'POST', body: JSON.stringify({ name }) }),
    remove: (key: string) =>
      apiFetch<AdminOfferType[]>(`/api/admin/offer-types/${encodeURIComponent(key)}`, { method: 'DELETE' }),
  },
  // Operator notes (owner + manager). refId omitted → by type or all.
  notes: {
    // All notes for ONE entity (the inline Notes panel). limit=100 so a single
    // order/product shows its whole thread, not just the first page.
    list: (type?: NoteType | '', refId?: string) =>
      apiFetch<Note[]>(
        `/api/admin/notes?type=${encodeURIComponent(type ?? '')}&refId=${encodeURIComponent(refId ?? '')}&limit=100`,
      ),
    // One page of the full notes list (the admin Notes screen's infinite list).
    listPage: (type: NoteType | '', page = 1) =>
      apiFetchPage<Note>(`/api/admin/notes?type=${encodeURIComponent(type)}&page=${page}&limit=20`),
    create: (body: { type: NoteType; refId?: string; body: string }) =>
      apiFetch<Note>('/api/admin/notes', { method: 'POST', body: JSON.stringify(body) }),
    remove: (id: string) => apiFetch<{ ok: boolean }>(`/api/admin/notes/${id}`, { method: 'DELETE' }),
  },
  // Payments (owner only): list, one payment's detail, and the owner's manual
  // status actions (mark cash collected / mark refunded).
  payments: {
    list: (status = '', method = '', q = '', page = 1) =>
      apiFetchPage<Order>(
        `/api/admin/payments?status=${encodeURIComponent(status)}&method=${encodeURIComponent(method)}&q=${encodeURIComponent(q)}&page=${page}&limit=20`,
      ),
    get: (id: string) => apiFetch<PaymentDetail>(`/api/admin/payments/${id}`),
    setStatus: (id: string, status: string) =>
      apiFetch<PaymentDetail>(`/api/admin/payments/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      }),
  },
};

// Upload an image straight to Cloudinary (a free image host/CDN) with an
// unsigned preset, and return its hosted URL to store on a product. No file
// passes through our own server. Throws a clear error if Cloudinary isn't set
// up — in that case the admin can still paste a URL/path by hand.
export async function uploadImage(file: File): Promise<string> {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloud || !preset) {
    throw new Error('Image upload isn’t set up yet. Paste an image URL/path instead, or add Cloudinary keys.');
  }
  const body = new FormData();
  body.append('file', file);
  body.append('upload_preset', preset);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method: 'POST',
    body,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.secure_url) {
    throw new Error(json?.error?.message ?? 'Upload failed. Try again, or paste a URL.');
  }
  return json.secure_url as string;
}

// Upload an image OR a video to Cloudinary ("auto" lets Cloudinary decide) and say
// which one it was, so the caller can tag the media item. Videos are capped by
// NEXT_PUBLIC_CLOUDINARY_MAX_VIDEO_MB (default 50) before anything is sent.
export async function uploadMedia(file: File): Promise<{ url: string; type: 'image' | 'video' }> {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloud || !preset) {
    throw new Error('Upload isn’t set up yet. Paste a link/path instead, or add the Cloudinary keys.');
  }
  const maxMb = Number(process.env.NEXT_PUBLIC_CLOUDINARY_MAX_VIDEO_MB) || 50;
  if (file.type.startsWith('video/') && file.size > maxMb * 1024 * 1024) {
    throw new Error(`That video is over ${maxMb} MB. Compress it, or paste a link.`);
  }
  const body = new FormData();
  body.append('file', file);
  body.append('upload_preset', preset);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/auto/upload`, { method: 'POST', body });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.secure_url) {
    throw new Error(json?.error?.message ?? 'Upload failed. Try again, or paste a link.');
  }
  return { url: json.secure_url as string, type: json.resource_type === 'video' ? 'video' : 'image' };
}

// Guess image-vs-video from a pasted link (uploads already know). Cloudinary video
// links contain /video/upload/; otherwise go by the file extension.
export function guessMediaType(url: string): 'image' | 'video' {
  return /\/video\/upload\/|\.(mp4|webm|mov|m4v)(\?|$)/i.test(url) ? 'video' : 'image';
}

// True when Cloudinary upload is configured (controls the Upload button UI).
export function uploadConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME && process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
  );
}

// --- Customer accounts (browser-only, session-cookie) -----------------------

type AddressInput = Omit<SavedAddress, 'id'>;

export const accountApi = {
  signup: (body: { email: string; password: string; name: string }) =>
    apiFetch<Customer>('/api/account/signup', { method: 'POST', body: JSON.stringify(body) }),
  login: (email: string, password: string) =>
    apiFetch<Customer>('/api/account/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => apiFetch<{ ok: boolean }>('/api/account/logout', { method: 'POST' }),
  me: () => apiFetch<Customer>('/api/account/me'),
  verify: (token: string) =>
    apiFetch<{ ok: boolean }>('/api/account/verify', { method: 'POST', body: JSON.stringify({ token }) }),
  forgot: (email: string) =>
    apiFetch<{ ok: boolean }>('/api/account/password/forgot', { method: 'POST', body: JSON.stringify({ email }) }),
  reset: (token: string, password: string) =>
    apiFetch<{ ok: boolean }>('/api/account/password/reset', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),
  addAddress: (body: Partial<AddressInput>) =>
    apiFetch<SavedAddress[]>('/api/account/addresses', { method: 'POST', body: JSON.stringify(body) }),
  updateAddress: (id: string, body: Partial<AddressInput>) =>
    apiFetch<SavedAddress[]>(`/api/account/addresses/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteAddress: (id: string) =>
    apiFetch<SavedAddress[]>(`/api/account/addresses/${id}`, { method: 'DELETE' }),
};

// Format paise (integers) as Indian rupees, e.g. 2499900 -> "₹24,999.00".
export function money(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(paise / 100);
}
