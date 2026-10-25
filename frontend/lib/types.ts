// Mirrors the backend's `pagination` block (see backend/src/lib/pagination.ts).
// `hasMore` saves the client the arithmetic.
export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

// One photo or video of a variant. `position` is the display order (0 = first).
export interface MediaItem {
  url: string; // /path or https link
  type: 'image' | 'video';
  position: number;
}

export interface Variant {
  _id: string;
  sku: string;
  size: string;
  color: string;
  price: number; // paise
  compareAt: number;
  stock: number;
  lowStock: number;
  media?: MediaItem[]; // this variant's own gallery (absent/empty = "No Image Available")
}

export interface Product {
  _id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  image: string; // primary / card thumbnail
  images?: string[]; // extra gallery shots (absent/empty = single image)
  featured?: boolean; // editorial "Staff picks" flag
  offerTypes?: string[]; // offer keys, e.g. ['diwali'] (absent on old products = none)
  soldCount?: number; // units sold, derived from real orders (0 when none)
  specs: Record<string, string>;
  status: string;
  variants: Variant[];
}

// --- Admin product editing --------------------------------------------------
// What the admin form sends to create/update a product. Money is in paise
// (the form collects rupees and converts before sending).
export interface VariantInput {
  _id?: string; // kept on edit so the variant keeps its id (carts/orders/inventory)
  sku: string;
  size: string;
  color: string;
  price: number; // paise
  compareAt: number; // paise, 0 = none
  stock: number;
  lowStock: number;
  media: MediaItem[];
}

export interface ProductInput {
  slug: string;
  name: string;
  category: string;
  description: string;
  image: string;
  images: string[];
  featured: boolean;
  offerTypes: string[];
  status: 'draft' | 'published' | 'archived';
  specs: Record<string, string>;
  variants: VariantInput[];
}

// What the checkout learns when the customer types a pincode (GET /api/delivery/:pin).
export interface DeliveryQuote {
  pin: string;
  kanpur: boolean; // inside the flat-fee area
  fee: number; // paise; 0 outside Kanpur (an agent agrees the charge by phone)
  lookup: 'ok' | 'not_found' | 'unavailable'; // did the pincode directory answer?
  city: string; // '' unless lookup === 'ok'
  state: string;
}

// Public shop details shown in the storefront footer/showroom. Every field can
// be '' — the UI falls back to an honest "coming soon" when blank.
export interface StoreSettings {
  addressLine1: string;
  city: string;
  state: string;
  pin: string;
  phone: string;
  whatsapp: string;
  hours: string;
  deliveryPolicy: string;
  email: string;
  // Operational config (Platform tab). The storefront reads the toggles + banner.
  codEnabled: boolean;
  onlinePaymentEnabled: boolean;
  announcement: string;
  // Flat "Fitted Delivery" fee inside Kanpur, in paise (owner-editable; default ₹299).
  // Shown in the delivery messages — the server still prices every order itself.
  kanpurDeliveryFee: number;
  // Pincodes charged that fee. Admin settings only (the public API never sends the list;
  // the storefront asks /api/delivery/:pin instead).
  kanpurPincodes?: string[];
  // Admin-editable site content (Site content tab). Defaults are merged by the API.
  hero: HeroContent;
  offerSection: OfferSection;
  retailers: Retailer[];
}

// The text laid over the hero video. A '' field hides its line; '' promoHref
// means the Stellar Originals text is not clickable.
export interface HeroContent {
  statValue: string;
  statLabel: string;
  tagline: string;
  ctaLabel: string;
  ctaHref: string;
  promoTitle: string;
  promoSubtitle: string;
  promoHref: string;
}

// The homepage offer rail — switched on/off and re-pointed from the admin.
export interface OfferSection {
  enabled: boolean;
  title: string;
  subtitle: string;
  offerTypes: string[];
}

export interface Retailer {
  name: string;
  logo: string; // https:// link or /path
  href: string; // '' = not clickable
}

// One row in the admin offer-type manager (count > 0 means delete is blocked).
export interface AdminOfferType {
  key: string;
  count: number;
}

// One row in the admin category manager: a name and how many products use it
// (count > 0 means delete is blocked).
export interface AdminCategory {
  name: string;
  count: number;
}

// One line in the server-computed cart view. Fields past `available` are present
// only when the variant still exists and is published.
export interface CartLine {
  variantId: string;
  quantity: number;
  available: boolean;
  name?: string;
  slug?: string;
  sku?: string;
  size?: string;
  color?: string;
  image?: string;
  price?: number; // live paise
  stock?: number;
  lineTotal?: number;
  inStock?: boolean;
}

export interface CartView {
  items: CartLine[];
  subtotal: number; // paise
  itemCount: number;
}

export interface OrderItem {
  variantId: string;
  name: string;
  sku: string;
  quantity: number;
  price: number; // paise, snapshotted at purchase
}

export interface Address {
  name: string;
  phone: string;
  line1: string;
  city: string;
  state: string;
  pin: string;
}

// A saved address in a customer's address book (an Address plus id/label/default).
export interface SavedAddress extends Address {
  id: string;
  label: string;
  isDefault: boolean;
}

// The logged-in storefront customer (never includes the password hash).
export interface Customer {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  addresses: SavedAddress[];
}

export interface Payment {
  provider?: string;
  razorpayOrderId?: string;
  paymentId?: string;
  method?: string; // upi / card / netbanking / wallet
  amount?: number; // paise captured
  paidAt?: string;
}

// An advance-payment request an agent raised on an order (e.g. the delivery charge).
// The customer pays it from their order page; `shortUrl` is Razorpay's hosted page.
export interface AdvancePayment {
  _id: string;
  amount: number; // paise
  note: string;
  status: 'created' | 'paid' | 'cancelled' | 'expired'; // created = open, awaiting payment
  razorpayLinkId: string;
  shortUrl: string;
  paymentId?: string;
  method?: string;
  paidAt?: string;
  createdBy?: string; // staff email — admin view only, never sent to customers
  createdAt: string;
}

export interface Order {
  _id: string;
  email: string;
  address: Address;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  method: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  tracking: string;
  payment?: Payment;
  advancePayments?: AdvancePayment[];
  createdAt: string;
}

// A payment's full detail + the statuses the owner may move it to.
export interface PaymentDetail {
  order: Order;
  nextStatuses: string[];
}

// --- Admin ---
export interface StaffMe {
  email: string;
  role: string;
}

export type NoteType = 'order' | 'product' | 'inventory' | 'general';

export interface Note {
  _id: string;
  author: string;
  body: string;
  targetType: NoteType;
  targetId?: string;
  createdAt: string;
}

export interface LowStockRow {
  productName: string;
  sku: string;
  size: string;
  color: string;
  stock: number;
  lowStock: number;
}

export interface DashboardKpis {
  revenue: number; // paise
  orders: number;
  avgOrder: number; // paise
  paidCount: number;
  codCount: number;
  onlineCount: number;
  unfulfilled: number;
  lowStockCount: number;
}

export interface DashboardData {
  kpis: DashboardKpis;
  series: { date: string; revenue: number; orders: number }[]; // revenue paise
  methods: { method: string; count: number; value: number }[];
  statuses: { status: string; count: number }[];
  topProducts: { name: string; units: number; revenue: number }[];
  lowStock: LowStockRow[];
  recent: Order[];
}

export interface InvVariant {
  variantId: string;
  productName: string;
  slug: string;
  sku: string;
  size: string;
  color: string;
  price: number;
  stock: number;
  lowStock: number;
}

export interface Movement {
  _id: string;
  variantId: string;
  actor: string;
  reason: string;
  before: number;
  after: number;
  createdAt: string;
}

export interface InventoryData {
  variants: InvVariant[];
  movements: Movement[];
}

export interface OrderDetail {
  order: Order;
  nextStates: string[];
  advanceEnabled: boolean; // Razorpay keys are set, so payment links can be raised
}
