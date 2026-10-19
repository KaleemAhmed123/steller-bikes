'use client';

import { use, useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import type { Product } from '@/lib/types';
import { ProductForm } from '../../components/ProductForm';
import { Notes } from '../../components/Notes';

export default function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.products
      .get(id)
      .then(setProduct)
      .catch((e: Error) => setError(e.message));
  }, [id]);

  if (error) return <div className="notice error">{error}</div>;
  if (!product) return <p className="muted">Loading…</p>;

  return (
    <div>
      <h1 className="admin-h1">Edit: {product.name}</h1>
      <ProductForm product={product} />
      <Notes type="product" refId={product._id} />
    </div>
  );
}
