'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { accountApi, getOrdersPage, money } from '@/lib/api';
import type { Order, SavedAddress } from '@/lib/types';
import { useInfiniteList } from '@/lib/useInfiniteList';
import { LoadMore } from '@/components/LoadMore';
import { useAccount } from '../components/AccountProvider';

const EMPTY_ADDR = { label: '', name: '', phone: '', line1: '', city: '', state: '', pin: '' };

export default function AccountPage() {
  const router = useRouter();
  const { customer, loading, setCustomer, refresh } = useAccount();
  const fetchOrders = useCallback((page: number) => getOrdersPage(page), []);
  const {
    items: orders,
    loading: ordersLoading,
    error: ordersError,
    hasMore: ordersHasMore,
    total: ordersTotal,
    loadMore: loadMoreOrders,
    reset: resetOrders,
  } = useInfiniteList<Order>(fetchOrders, { getId: (o) => o._id });
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [showAddr, setShowAddr] = useState(false);
  const [addr, setAddr] = useState(EMPTY_ADDR);
  const [addrError, setAddrError] = useState('');
  const [busy, setBusy] = useState(false);

  // Not signed in → send to login.
  useEffect(() => {
    if (!loading && !customer) router.replace('/login');
  }, [loading, customer, router]);

  // Load order history + addresses once we know who's signed in.
  useEffect(() => {
    if (!customer) return;
    setAddresses(customer.addresses);
    resetOrders();
  }, [customer, resetOrders]);

  if (loading || !customer) {
    return (
      <div className="account-page">
        <div className="skeleton skeleton-line" style={{ width: 200, height: 28, margin: '20px 0 10px' }} />
        <div className="skeleton skeleton-line short" style={{ marginBottom: 28 }} />
        <div className="skeleton" style={{ height: 140, borderRadius: 12, marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 120, borderRadius: 12 }} />
      </div>
    );
  }

  const set = (key: keyof typeof EMPTY_ADDR) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setAddr((a) => ({ ...a, [key]: e.target.value }));

  async function logout() {
    await accountApi.logout();
    setCustomer(null);
    router.replace('/');
  }

  async function addAddress(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setAddrError('');
    try {
      const next = await accountApi.addAddress(addr);
      setAddresses(next);
      await refresh();
      setAddr(EMPTY_ADDR);
      setShowAddr(false);
    } catch (err) {
      setAddrError(err instanceof Error ? err.message : 'Could not save address');
    } finally {
      setBusy(false);
    }
  }

  async function makeDefault(id: string) {
    setAddresses(await accountApi.updateAddress(id, { isDefault: true }));
    await refresh();
  }

  async function removeAddress(id: string) {
    setAddresses(await accountApi.deleteAddress(id));
    await refresh();
  }

  return (
    <div className="account-page">
      <div className="account-head">
        <div>
          <h1>Hi, {customer.name}</h1>
          <p className="muted">
            {customer.email}{' '}
            {customer.emailVerified ? (
              <span className="badge badge-ok">Verified</span>
            ) : (
              <span className="badge badge-warn">Email not verified</span>
            )}
          </p>
        </div>
        <button className="btn-ghost" onClick={logout}>
          Sign out
        </button>
      </div>

      {!customer.emailVerified && (
        <div className="notice">
          Verify your email to link any past guest orders. The link was sent when you signed up
          (in dev, it&apos;s printed in the backend server console).
        </div>
      )}

      <section className="account-section">
        <h2>Your orders</h2>
        {orders.length === 0 && !ordersLoading && !ordersError ? (
          <p className="muted">No orders yet. <Link href="/shop">Browse cycles →</Link></p>
        ) : (
          <>
            <div className="order-history">
              {orders.map((o) => (
                <Link key={o._id} href={`/order/${o._id}`} className="order-row">
                  <div>
                    <strong>#{o._id.slice(-8).toUpperCase()}</strong>
                    <span className="muted"> · {new Date(o.createdAt).toLocaleDateString('en-IN')}</span>
                  </div>
                  <div className="order-row-meta">
                    <span className="badge">{o.fulfillmentStatus}</span>
                    <span>{money(o.total)}</span>
                  </div>
                </Link>
              ))}
            </div>
            <LoadMore
              onLoadMore={loadMoreOrders}
              hasMore={ordersHasMore}
              loading={ordersLoading}
              error={ordersError}
              count={orders.length}
              total={ordersTotal}
              label="orders"
            />
          </>
        )}
      </section>

      <section className="account-section">
        <div className="account-section-head">
          <h2>Saved addresses</h2>
          {!showAddr && (
            <button className="btn-ghost" onClick={() => setShowAddr(true)}>
              + Add address
            </button>
          )}
        </div>

        {addresses.length === 0 && !showAddr && (
          <p className="muted">No saved addresses yet.</p>
        )}

        <div className="address-list">
          {addresses.map((a) => (
            <div key={a.id} className="address-card">
              <div className="address-body">
                {a.label && <div className="address-label">{a.label}</div>}
                <div>{a.name} · {a.phone}</div>
                <div className="muted">
                  {a.line1}, {a.city}, {a.state} — {a.pin}
                </div>
              </div>
              <div className="address-actions">
                {a.isDefault ? (
                  <span className="badge badge-ok">Default</span>
                ) : (
                  <button className="link-btn" onClick={() => makeDefault(a.id)}>
                    Make default
                  </button>
                )}
                <button className="link-btn danger" onClick={() => removeAddress(a.id)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        {showAddr && (
          <form className="checkout-form address-form" onSubmit={addAddress}>
            <label className="field">
              <span className="field-label">Label (e.g. Home)</span>
              <input value={addr.label} onChange={set('label')} />
            </label>
            <label className="field">
              <span className="field-label">Full name</span>
              <input required value={addr.name} onChange={set('name')} />
            </label>
            <label className="field">
              <span className="field-label">Phone (10 digits)</span>
              <input required inputMode="numeric" pattern="\d{10}" value={addr.phone} onChange={set('phone')} />
            </label>
            <label className="field">
              <span className="field-label">Address</span>
              <input required value={addr.line1} onChange={set('line1')} />
            </label>
            <div className="field-row">
              <label className="field">
                <span className="field-label">City</span>
                <input required value={addr.city} onChange={set('city')} />
              </label>
              <label className="field">
                <span className="field-label">State</span>
                <input required value={addr.state} onChange={set('state')} />
              </label>
              <label className="field">
                <span className="field-label">PIN (6 digits)</span>
                <input required inputMode="numeric" pattern="\d{6}" value={addr.pin} onChange={set('pin')} />
              </label>
            </div>
            {addrError && <div className="notice error">{addrError}</div>}
            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? 'Saving…' : 'Save address'}
              </button>
              <button type="button" className="btn-ghost" onClick={() => { setShowAddr(false); setAddr(EMPTY_ADDR); }}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
