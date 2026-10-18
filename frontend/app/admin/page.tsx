'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi, money } from '@/lib/api';
import type { DashboardData } from '@/lib/types';

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.dashboard().then(setData).catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <div className="notice error">{error}</div>;
  if (!data) return <p className="muted">Loading…</p>;

  return (
    <div>
      <h1 className="admin-h1">Dashboard</h1>

      <div className="stat-row">
        <div className="stat">
          <span className="stat-label">Orders</span>
          <span className="stat-value">{data.orderCount}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Revenue</span>
          <span className="stat-value">{money(data.revenue)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Low-stock variants</span>
          <span className="stat-value">{data.lowStock.length}</span>
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
      {data.recent.length === 0 && <div className="empty">No orders yet.</div>}

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
