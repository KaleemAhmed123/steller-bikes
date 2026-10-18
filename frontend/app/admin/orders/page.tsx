'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi, money } from '@/lib/api';
import type { Order } from '@/lib/types';

const STATUSES = ['', 'confirmed', 'processing', 'packed', 'shipped', 'delivered', 'delivery_failed', 'cancelled'];

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    adminApi
      .orders(status, q.trim())
      .then(setOrders)
      .catch((e: Error) => setError(e.message));
  }, [status, q]);

  // Debounce so typing the search isn't a request per keystroke.
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div>
      <h1 className="admin-h1">Orders</h1>
      <div className="admin-filters">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s ? s.replace('_', ' ') : 'All statuses'}
            </option>
          ))}
        </select>
        <input placeholder="Search ref / phone / email" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {error && <div className="notice error">{error}</div>}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Ref</th>
            <th>Customer</th>
            <th>Status</th>
            <th>Payment</th>
            <th>Total</th>
            <th>When</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o._id}>
              <td>
                <Link href={`/admin/orders/${o._id}`}>{o._id.slice(-8).toUpperCase()}</Link>
              </td>
              <td>
                {o.address?.name} · {o.address?.phone}
              </td>
              <td>{o.fulfillmentStatus}</td>
              <td>{o.paymentStatus}</td>
              <td>{money(o.total)}</td>
              <td>{new Date(o.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {orders.length === 0 && !error && <div className="empty">No orders match.</div>}
    </div>
  );
}
