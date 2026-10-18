export interface Variant {
  _id: string;
  sku: string;
  size: string;
  color: string;
  price: number; // paise
  compareAt: number;
  stock: number;
  lowStock: number;
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
}

export interface ProductInput {
  slug: string;
  name: string;
  category: string;
  description: string;
  image: string;
  images: string[];
  featured: boolean;
  status: 'draft' | 'published' | 'archived';
  specs: Record<string, string>;
  variants: VariantInput[];
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
  createdAt: string;
}

// --- Admin ---
export interface StaffMe {
  email: string;
  role: string;
}

export interface LowStockRow {
  productName: string;
  sku: string;
  size: string;
  color: string;
  stock: number;
  lowStock: number;
}

export interface DashboardData {
  orderCount: number;
  revenue: number;
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
}
