'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi, money } from '@/lib/api';
import type { Order } from '@/lib/types';
import { useInfiniteList } from '@/lib/useInfiniteList';
import { LoadMore } from '@/components/LoadMore';
import { Notes } from '../components/Notes';

const STATUSES = ['', 'confirmed', 'processing', 'packed', 'shipped', 'delivered', 'delivery_failed', 'cancelled'];

export default function AdminOrders() {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [openNotes, setOpenNotes] = useState<string | null>(null);

  const fetchPage = useCallback((page: number) => adminApi.orders(status, q.trim(), page), [status, q]);
  const { items: orders, loading, error, hasMore, total, loadMore, reset } = useInfiniteList<Order>(fetchPage, {
    getId: (o) => o._id,
  });

  // Debounce so typing the search isn't a request per keystroke; any filter change
  // re-seeds from page 1 (reset changes when status/q change).
  useEffect(() => {
    const t = setTimeout(() => reset(), 250);
    return () => clearTimeout(t);
  }, [reset]);

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
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <Fragment key={o._id}>
              <tr>
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
                <td>
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => setOpenNotes((cur) => (cur === o._id ? null : o._id))}
                  >
                    {openNotes === o._id ? 'Hide' : 'Notes'}
                  </button>
                </td>
              </tr>
              {openNotes === o._id && (
                <tr>
                  <td colSpan={7}>
                    <Notes type="order" refId={o._id} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
      {orders.length === 0 ? (
        !loading && !error && <div className="empty">No orders match.</div>
      ) : (
        <LoadMore
          onLoadMore={loadMore}
          hasMore={hasMore}
          loading={loading}
          error={error}
          count={orders.length}
          total={total}
          label="orders"
          auto={false}
        />
      )}
    </div>
  );
}
