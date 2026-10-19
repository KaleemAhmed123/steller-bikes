'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { adminApi, money } from '@/lib/api';
import type { DashboardData } from '@/lib/types';

const RANGES: [string, string][] = [
  ['today', 'Today'],
  ['7d', '7 days'],
  ['15d', '15 days'],
  ['30d', '30 days'],
  ['all', 'All'],
];

const INK = '#1a1a1a';
const BLUE = '#3d82ff';
const PIE_COLORS = [BLUE, '#f4a259', '#6bbf86', '#b98bdb', '#e76f69'];

// ₹ for chart axes/tooltips (values here are already in rupees).
const rupee = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export default function AdminDashboard() {
  const [range, setRange] = useState('30d');
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    adminApi
      .dashboard(range)
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <div className="notice error">{error}</div>;
  if (!data) return <p className="muted">Loading…</p>;

  const k = data.kpis;
  const revenueData = data.series.map((d) => ({ date: d.date.slice(5), revenue: Math.round(d.revenue / 100), orders: d.orders }));
  const methodData = data.methods.map((m) => ({ name: m.method === 'cod' ? 'COD' : 'Online', value: m.count }));
  const statusData = data.statuses.map((s) => ({ name: s.status.replace('_', ' '), count: s.count }));
  const topData = data.topProducts.map((t) => ({ name: t.name, units: t.units }));

  return (
    <div>
      <div className="dash-head">
        <h1 className="admin-h1">Dashboard</h1>
        <div className="dash-chips">
          {RANGES.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`chip ${range === value ? 'active' : ''}`}
              onClick={() => setRange(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="kpi-grid">
        <Kpi label="Revenue" value={money(k.revenue)} hint="placed, excl. cancelled" />
        <Kpi label="Orders" value={String(k.orders)} />
        <Kpi label="Avg order" value={money(k.avgOrder)} />
        <Kpi label="Paid" value={String(k.paidCount)} />
        <Kpi label="COD" value={String(k.codCount)} />
        <Kpi label="Unfulfilled" value={String(k.unfulfilled)} />
        <Kpi label="Low stock" value={String(k.lowStockCount)} />
      </div>

      <div className="chart-grid">
        <div className="chart-card chart-wide">
          <h3 className="chart-title">Revenue per day</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={revenueData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BLUE} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={BLUE} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} width={54} tickFormatter={(v) => rupee(v)} />
              <Tooltip formatter={(v) => rupee(Number(v))} />
              <Area type="monotone" dataKey="revenue" stroke={BLUE} strokeWidth={2} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card chart-wide">
          <h3 className="chart-title">Orders per day</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={revenueData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={32} />
              <Tooltip />
              <Bar dataKey="orders" fill={INK} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Payment method</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={methodData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                {methodData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="chart-legend">
            {methodData.map((m, i) => (
              <span key={m.name}>
                <i style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} /> {m.name} ({m.value})
              </span>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Fulfillment status</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={statusData} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill={BLUE} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Top products (units)</h3>
          {topData.length === 0 ? (
            <p className="muted">No sales in range.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topData} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="units" fill="#6bbf86" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <h2 className="admin-h2">Recent orders</h2>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Ref</th>
            <th>Status</th>
            <th>Payment</th>
            <th>Total</th>
            <th>When</th>
          </tr>
        </thead>
        <tbody>
          {data.recent.map((o) => (
            <tr key={o._id}>
              <td>
                <Link href={`/admin/orders/${o._id}`}>{o._id.slice(-8).toUpperCase()}</Link>
              </td>
              <td>{o.fulfillmentStatus}</td>
              <td>{o.paymentStatus}</td>
              <td>{money(o.total)}</td>
              <td>{new Date(o.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.recent.length === 0 && <div className="empty">No orders in range.</div>}

      {data.lowStock.length > 0 && (
        <>
          <h2 className="admin-h2">Low stock</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Stock</th>
                <th>Low at</th>
              </tr>
            </thead>
            <tbody>
              {data.lowStock.map((v, i) => (
                <tr key={i} className="row-low">
                  <td>
                    {v.productName} ({v.size}/{v.color})
                  </td>
                  <td>{v.sku}</td>
                  <td>{v.stock}</td>
                  <td>{v.lowStock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="kpi">
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
      {hint && <span className="kpi-hint">{hint}</span>}
    </div>
  );
}
