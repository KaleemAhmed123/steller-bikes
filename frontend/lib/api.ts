import type {
  Address,
  CartView,
  Customer,
  DashboardData,
  InventoryData,
  Order,
  OrderDetail,
  Product,
  ProductInput,
  SavedAddress,
  StaffMe,
  StoreSettings,
} from './types';

// The Express API base URL. Public (not a secret) so it works in both the
// server-render and the browser. Falls back to local dev if unset.
const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type ListResult = { products: Product[]; categories: string[] };

// Which URL search params we forward to the API as catalogue filters.
const FILTER_KEYS = ['category', 'q', 'minPrice', 'maxPrice'] as const;

// Fetch the (optionally filtered) catalogue + the category list.
// cache:'no-store' = always fresh, so stock/price are never stale.
export async function getProducts(
  searchParams: Record<string, string | string[] | undefined>,
): Promise<ListResult> {
  const qs = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = searchParams[key];
    if (typeof value === 'string' && value) qs.set(key, value);
  }

  const res = await fetch(`${BASE}/api/products?${qs.toString()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load products');

  const json = await res.json();
  return {
    products: (json.data ?? []) as Product[],
    categories: (json.categories ?? []) as string[],
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

const EMPTY_SETTINGS: StoreSettings = {
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

export async function getOrder(id: string): Promise<Order> {
  const res = await fetch(`${BASE}/api/orders/${id}`, { credentials: 'include' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message ?? 'Order not found');
  return json.data as Order;
}

// This browser's order history (for a logged-in customer, all their orders).
export function getOrders(): Promise<Order[]> {
  return apiFetch<Order[]>('/api/orders');
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

export const adminApi = {
  login: (email: string, password: string) =>
    apiFetch<StaffMe>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => apiFetch<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  me: () => apiFetch<StaffMe>('/api/auth/me'),
  dashboard: () => apiFetch<DashboardData>('/api/admin/dashboard'),
  orders: (status: string, q: string) =>
    apiFetch<Order[]>(`/api/admin/orders?status=${encodeURIComponent(status)}&q=${encodeURIComponent(q)}`),
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
    list: () => apiFetch<Product[]>('/api/admin/products'),
    get: (id: string) => apiFetch<Product>(`/api/admin/products/${id}`),
    create: (body: ProductInput) =>
      apiFetch<Product>('/api/admin/products', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: Partial<ProductInput>) =>
      apiFetch<Product>(`/api/admin/products/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    remove: (id: string) =>
      apiFetch<{ ok: boolean }>(`/api/admin/products/${id}`, { method: 'DELETE' }),
  },
  // Store settings (owner only).
  settings: {
    get: () => apiFetch<Partial<StoreSettings>>('/api/admin/settings'),
    update: (body: Partial<StoreSettings>) =>
      apiFetch<StoreSettings>('/api/admin/settings', { method: 'PATCH', body: JSON.stringify(body) }),
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
