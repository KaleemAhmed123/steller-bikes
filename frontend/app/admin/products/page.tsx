'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import type { Product } from '@/lib/types';
import { useInfiniteList } from '@/lib/useInfiniteList';
import { LoadMore } from '@/components/LoadMore';
import { Notes } from '../components/Notes';

export default function AdminProducts() {
  const fetchPage = useCallback((page: number) => adminApi.products.list(page), []);
  const {
    items: products,
    setItems: setProducts,
    loading,
    error,
    hasMore,
    total,
    loadMore,
    reset,
  } = useInfiniteList<Product>(fetchPage, { getId: (p) => p._id });
  const [deleteError, setDeleteError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [openNotes, setOpenNotes] = useState<string | null>(null);

  useEffect(() => {
    reset();
  }, [reset]);

  async function remove(p: Product) {
    if (!confirm(`Delete “${p.name}”? This cannot be undone. (To just hide it, edit and set status to Archived.)`)) return;
    setBusyId(p._id);
    setDeleteError('');
    try {
      await adminApi.products.remove(p._id);
      setProducts((cur) => cur.filter((x) => x._id !== p._id));
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Delete failed.');
    } finally {
      setBusyId('');
    }
  }

  if (error && products.length === 0) return <div className="notice error">{error}</div>;
  if (loading && products.length === 0) return <p className="muted">Loading…</p>;

  return (
    <div>
      <div className="admin-head-row">
        <h1 className="admin-h1">Products</h1>
        <Link href="/admin/products/new" className="btn-primary">
          + New product
        </Link>
      </div>

      {deleteError && <div className="notice error">{deleteError}</div>}

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
            <Fragment key={p._id}>
              <tr>
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
                    className="link-btn"
                    onClick={() => setOpenNotes((cur) => (cur === p._id ? null : p._id))}
                  >
                    {openNotes === p._id ? 'Hide' : 'Notes'}
                  </button>
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
              {openNotes === p._id && (
                <tr>
                  <td colSpan={6}>
                    <Notes type="product" refId={p._id} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
      {products.length === 0 ? (
        <div className="empty">No products yet. Create one to get started.</div>
      ) : (
        <LoadMore
          onLoadMore={loadMore}
          hasMore={hasMore}
          loading={loading}
          error={error}
          count={products.length}
          total={total}
          label="products"
          auto={false}
        />
      )}
    </div>
  );
}
