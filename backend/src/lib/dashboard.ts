import { OrderModel } from '../models/order.js';
import { ProductModel } from '../models/product.js';

// The shop is in Kanpur — day boundaries are IST, not the server's UTC, so
// "Today" means today in India. India has no DST, so a fixed zone string is safe.
const TZ = 'Asia/Kolkata';

export type Range = 'today' | '7d' | '15d' | '30d' | 'all';

// A Date as its IST calendar day, "YYYY-MM-DD" (en-CA formats that way).
function istDay(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

// IST midnight (as a UTC instant) of the day `dayKey` ("YYYY-MM-DD").
function istMidnight(dayKey: string): Date {
  return new Date(`${dayKey}T00:00:00+05:30`);
}

// The start instant for a range, or null for "all time". Pure → unit-tested.
export function rangeStart(range: string): Date | null {
  if (range === 'all') return null;
  const days = range === 'today' ? 0 : range === '7d' ? 6 : range === '15d' ? 14 : range === '30d' ? 29 : 29;
  const todayStart = istMidnight(istDay(new Date()));
  return new Date(todayStart.getTime() - days * 86_400_000);
}

export interface DashboardPayload {
  kpis: {
    revenue: number;
    orders: number;
    avgOrder: number;
    paidCount: number;
    codCount: number;
    onlineCount: number;
    unfulfilled: number;
    lowStockCount: number;
  };
  series: { date: string; revenue: number; orders: number }[];
  methods: { method: string; count: number; value: number }[];
  statuses: { status: string; count: number }[];
  topProducts: { name: string; units: number; revenue: number }[];
  lowStock: { productName: string; sku: string; size: string; color: string; stock: number; lowStock: number }[];
  recent: unknown[];
}

// Fill every day between the range start (or the first data day, for "all") and
// today so the time chart has a continuous x-axis instead of gaps.
function fillSeries(rows: { _id: string; revenue: number; orders: number }[], from: Date | null): DashboardPayload['series'] {
  const map = new Map(rows.map((r) => [r._id, r]));
  let start: Date;
  if (from) start = from;
  else if (rows.length) start = istMidnight(rows[0]._id);
  else return [];

  const out: DashboardPayload['series'] = [];
  const today = istDay(new Date());
  let cursor = istMidnight(istDay(start));
  // Guard against an absurd span (e.g. a very old "all") blowing up the payload.
  for (let i = 0; i < 400 && istDay(cursor) <= today; i++) {
    const key = istDay(cursor);
    const r = map.get(key);
    out.push({ date: key, revenue: r?.revenue ?? 0, orders: r?.orders ?? 0 });
    cursor = new Date(cursor.getTime() + 86_400_000);
  }
  return out;
}

// Build the whole dashboard for a range. `from` = null means all time. Cancelled
// orders (incl. refund_required, which are cancelled fulfilment) are excluded
// from revenue/orders/series/methods/products; the status chart shows everything.
export async function buildDashboard(from: Date | null): Promise<DashboardPayload> {
  const live = from ? { createdAt: { $gte: from }, fulfillmentStatus: { $ne: 'cancelled' } } : { fulfillmentStatus: { $ne: 'cancelled' } };
  const all = from ? { createdAt: { $gte: from } } : {};

  const [summary, seriesRaw, methods, statusesRaw, topProducts, recent, products] = await Promise.all([
    OrderModel.aggregate([
      { $match: live },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
          paidCount: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] } },
          codCount: { $sum: { $cond: [{ $eq: ['$method', 'cod'] }, 1, 0] } },
          onlineCount: { $sum: { $cond: [{ $eq: ['$method', 'razorpay'] }, 1, 0] } },
          unfulfilled: { $sum: { $cond: [{ $in: ['$fulfillmentStatus', ['confirmed', 'processing', 'packed']] }, 1, 0] } },
        },
      },
    ]),
    OrderModel.aggregate([
      { $match: live },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    OrderModel.aggregate([
      { $match: live },
      { $group: { _id: '$method', count: { $sum: 1 }, value: { $sum: '$total' } } },
    ]),
    OrderModel.aggregate([
      { $match: all },
      { $group: { _id: '$fulfillmentStatus', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    OrderModel.aggregate([
      { $match: live },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          units: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        },
      },
      { $sort: { units: -1 } },
      { $limit: 5 },
    ]),
    OrderModel.find(all).sort({ createdAt: -1 }).limit(8).lean(),
    ProductModel.find({}).lean(),
  ]);

  const s = summary[0] ?? { revenue: 0, orders: 0, paidCount: 0, codCount: 0, onlineCount: 0, unfulfilled: 0 };

  const lowStock: DashboardPayload['lowStock'] = [];
  for (const p of products) {
    for (const v of p.variants) {
      if (v.stock <= v.lowStock) {
        lowStock.push({ productName: p.name, sku: v.sku, size: v.size, color: v.color, stock: v.stock, lowStock: v.lowStock });
      }
    }
  }

  return {
    kpis: {
      revenue: s.revenue,
      orders: s.orders,
      avgOrder: s.orders ? Math.round(s.revenue / s.orders) : 0,
      paidCount: s.paidCount,
      codCount: s.codCount,
      onlineCount: s.onlineCount,
      unfulfilled: s.unfulfilled,
      lowStockCount: lowStock.length,
    },
    series: fillSeries(seriesRaw as { _id: string; revenue: number; orders: number }[], from),
    methods: (methods as { _id: string; count: number; value: number }[]).map((m) => ({ method: m._id, count: m.count, value: m.value })),
    statuses: (statusesRaw as { _id: string; count: number }[]).map((x) => ({ status: x._id, count: x.count })),
    topProducts: (topProducts as { _id: string; units: number; revenue: number }[]).map((t) => ({ name: t._id, units: t.units, revenue: t.revenue })),
    lowStock,
    recent,
  };
}
