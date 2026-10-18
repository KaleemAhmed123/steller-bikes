'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import type { Product } from '@/lib/types';

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  function load() {
    adminApi.products
      .list()
      .then(setProducts)
      .catch((e: Error) => setError(e.message));
  }

  useEffect(load, []);

  async function remove(p: Product) {
    if (!confirm(`Delete “${p.name}”? This cannot be undone. (To just hide it, edit and set status to Archived.)`)) return;
    setBusyId(p._id);
    setError('');
    try {
      await adminApi.products.remove(p._id);
      setProducts((cur) => (cur ?? []).filter((x) => x._id !== p._id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed.');
    } finally {
      setBusyId('');
    }
  }

  if (error && !products) return <div className="notice error">{error}</div>;
  if (!products) return <p className="muted">Loading…</p>;

  return (
    <div>
      <div className="admin-head-row">
        <h1 className="admin-h1">Products</h1>
        <Link href="/admin/products/new" className="btn-primary">
          + New product
        </Link>
      </div>

      {error && <div className="notice error">{error}</div>}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Status</th>
            <th>Featured</th>
            <th>Variants</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p._id}>
              <td>
                <Link href={`/admin/products/${p._id}`}>{p.name}</Link>
                <span className="muted"> /{p.slug}</span>
              </td>
              <td>{p.category}</td>
              <td>{p.status}</td>
              <td>{p.featured ? '★' : '—'}</td>
              <td>{p.variants.length}</td>
              <td className="admin-row-actions">
                <Link href={`/admin/products/${p._id}`}>Edit</Link>
                <button
                  type="button"
                  className="link-btn danger"
                  disabled={busyId === p._id}
                  onClick={() => remove(p)}
                >
                  {busyId === p._id ? 'Deleting…' : 'Delete'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {products.length === 0 && <div className="empty">No products yet. Create one to get started.</div>}
    </div>
  );
}
