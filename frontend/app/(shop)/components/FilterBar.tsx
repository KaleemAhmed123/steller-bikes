'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

// Set a param when it has a value, otherwise drop it from the URL.
function setOrDelete(params: URLSearchParams, key: string, value: string) {
  if (value) params.set(key, value);
  else params.delete(key);
}

// Interactive catalogue filters. Writes the chosen filters into the URL
// (category / q / price / sort) so the server re-renders the matching products
// and the result is shareable + bookmarkable. Prices typed in rupees → paise.
export function FilterBar({ categories, resultCount }: { categories: string[]; resultCount: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const toRupees = (paise: string | null) => (paise ? String(Number(paise) / 100) : '');

  const [q, setQ] = useState(params.get('q') ?? '');
  const [min, setMin] = useState(toRupees(params.get('minPrice')));
  const [max, setMax] = useState(toRupees(params.get('maxPrice')));

  const activeCategory = params.get('category') ?? '';
  const sort = params.get('sort') ?? 'newest';
  const anyFilter = Boolean(activeCategory || q || min || max || (sort && sort !== 'newest'));

  // Debounce text/price so typing isn't a request per keystroke.
  useEffect(() => {
    const id = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      setOrDelete(next, 'q', q.trim());
      setOrDelete(next, 'minPrice', min ? String(Math.round(Number(min) * 100)) : '');
      setOrDelete(next, 'maxPrice', max ? String(Math.round(Number(max) * 100)) : '');
      const str = next.toString();
      if (str !== params.toString()) router.push(`${pathname}?${str}`);
    }, 300);
    return () => clearTimeout(id);
  }, [q, min, max, params, pathname, router]);

  function selectCategory(category: string) {
    const next = new URLSearchParams(params.toString());
    setOrDelete(next, 'category', category === activeCategory ? '' : category);
    router.push(`${pathname}?${next.toString()}`);
  }

  function changeSort(value: string) {
    const next = new URLSearchParams(params.toString());
    setOrDelete(next, 'sort', value === 'newest' ? '' : value);
    router.push(`${pathname}?${next.toString()}`);
  }

  function clearAll() {
    setQ('');
    setMin('');
    setMax('');
    router.push(pathname);
  }

  return (
    <div className="rc-filters">
      <div className="rc-chips" role="group" aria-label="Filter by category">
        <button
          type="button"
          className={`rc-chip ${activeCategory === '' ? 'is-active' : ''}`}
          onClick={() => selectCategory('')}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`rc-chip ${activeCategory === cat ? 'is-active' : ''}`}
            onClick={() => selectCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="rc-filter-controls">
        <input
          type="search"
          className="rc-input rc-input--search"
          placeholder="Search cycles…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search cycles by name or keyword"
        />
        <input
          type="number"
          className="rc-input rc-input--price"
          placeholder="Min ₹"
          min={0}
          value={min}
          onChange={(e) => setMin(e.target.value)}
          aria-label="Minimum price in rupees"
        />
        <input
          type="number"
          className="rc-input rc-input--price"
          placeholder="Max ₹"
          min={0}
          value={max}
          onChange={(e) => setMax(e.target.value)}
          aria-label="Maximum price in rupees"
        />
        <label className="rc-sort">
          <span className="rc-sr-only">Sort by</span>
          <select value={sort} onChange={(e) => changeSort(e.target.value)} aria-label="Sort products">
            <option value="newest">Newest</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </label>
      </div>

      <div className="rc-filter-meta">
        <span>{resultCount} {resultCount === 1 ? 'bike' : 'bikes'}</span>
        {anyFilter && (
          <button type="button" className="rc-link-btn" onClick={clearAll}>
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
