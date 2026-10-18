// Live, server-computed view of a cart. The cart doc stores only variantId +
// quantity; everything with money/stock in it is recomputed here from the
// current product data, so a tampered or stale cart can never change the price.

export interface VariantInfo {
  variantId: string;
  name: string;
  slug: string;
  sku: string;
  size: string;
  color: string;
  image: string;
  price: number; // live, paise
  stock: number;
}

export interface CartLine {
  variantId: string;
  quantity: number;
  available: boolean; // the variant still exists and is published
  // present only when available:
  name?: string;
  slug?: string;
  sku?: string;
  size?: string;
  color?: string;
  image?: string;
  price?: number;
  stock?: number;
  lineTotal?: number; // price * quantity
  inStock?: boolean; // quantity fits in stock
}

export interface CartView {
  items: CartLine[];
  subtotal: number; // paise, sum of available lines
  itemCount: number; // total quantity of available lines
}

export function computeCartView(
  items: { variantId: string; quantity: number }[],
  variants: Map<string, VariantInfo>,
): CartView {
  let subtotal = 0;
  let itemCount = 0;

  const lines: CartLine[] = items.map((item) => {
    const v = variants.get(item.variantId);
    if (!v) {
      return { variantId: item.variantId, quantity: item.quantity, available: false };
    }
    const lineTotal = v.price * item.quantity;
    subtotal += lineTotal;
    itemCount += item.quantity;
    return {
      variantId: v.variantId,
      quantity: item.quantity,
      available: true,
      name: v.name,
      slug: v.slug,
      sku: v.sku,
      size: v.size,
      color: v.color,
      image: v.image,
      price: v.price,
      stock: v.stock,
      lineTotal,
      inStock: item.quantity <= v.stock,
    };
  });

  return { items: lines, subtotal, itemCount };
}
