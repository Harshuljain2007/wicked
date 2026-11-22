import { SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { SEED_PRODUCTS } from '../data/seedData';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import type { Product } from '../types';

const CATEGORY_TITLES: Record<string, string> = {
  all: 'All Apparel & Objects',
  tees: 'Heavyweight Tees',
  shirts: 'Everyday Poplin & Resort Shirts',
  kurtas: 'Ethnic Fusion Kurtas',
  hoodies: '420 GSM Loopback Hoodies',
  bottoms: 'Pleated & Cargo Bottoms',
  accessories: 'Waxed Canvas Accessories',
  new: 'New Arrivals',
  sale: 'Archive & Seasonal Offers',
};

const CATEGORY_TABS = [
  { slug: 'all', label: 'All' },
  { slug: 'tees', label: 'Tees' },
  { slug: 'kurtas', label: 'Kurtas' },
  { slug: 'shirts', label: 'Shirts' },
  { slug: 'hoodies', label: 'Hoodies' },
  { slug: 'bottoms', label: 'Bottoms' },
  { slug: 'accessories', label: 'Accessories' },
  { slug: 'new', label: 'New' },
  { slug: 'sale', label: 'Sale' },
];

export function CollectionPage() {
  const { slug = 'all' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>(SEED_PRODUCTS);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [gender, setGender] = useState<string>('all');
  const [size, setSize] = useState<string>('all');
  const [color, setColor] = useState<string>('all');
  const [fit, setFit] = useState<string>('all');
  const [maxPrice, setMaxPrice] = useState<number>(4500);
  const [sort, setSort] = useState<string>('featured');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [heavyweightOnly, setHeavyweightOnly] = useState(false);

  const { getProducts: getRecentProducts } = useRecentlyViewed();

  const queryText = searchParams.get('q') || '';
  const heading = queryText ? `Search: "${queryText}"` : CATEGORY_TITLES[slug] || 'Collection';

  useDocumentMeta({
    title: `${heading} — Wicked`,
    description: `Browse ${heading.toLowerCase()} by Wicked. Filter by size, colourway, GSM weight, fit, and price.`,
  });

  useEffect(() => {
    fetch('/api/products')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.products) setProducts(data.products);
      })
      .catch(() => {});
  }, []);

  const allColors = useMemo(
    () => Array.from(new Set(products.flatMap((p) => p.colors.map((c) => c.name)))),
    [products]
  );

  const allFits = useMemo(
    () => Array.from(new Set(products.map((p) => p.fit))),
    [products]
  );

  const filtered = useMemo(() => {
    let list = [...products];
    if (slug === 'new') {
      list = list.filter((p) => p.isNew);
    } else if (slug === 'sale') {
      list = list.filter((p) => p.onSale);
    } else if (slug !== 'all') {
      list = list.filter((p) => p.category === slug);
    }

    if (queryText.trim()) {
      const q = queryText.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.fabric.toLowerCase().includes(q) ||
          p.fit.toLowerCase().includes(q)
      );
    }

    if (gender !== 'all') {
      list = list.filter((p) => p.gender === gender || p.gender === 'unisex');
    }
    if (size !== 'all') {
      list = list.filter((p) => p.variants.some((v) => v.size === size && v.stock > 0));
    }
    if (color !== 'all') {
      list = list.filter((p) => p.colors.some((c) => c.name === color));
    }
    if (fit !== 'all') {
      list = list.filter((p) => p.fit === fit);
    }
    if (inStockOnly) {
      list = list.filter((p) => p.variants.some((v) => v.stock > 0));
    }
    if (heavyweightOnly) {
      list = list.filter((p) => p.gsm >= 280);
    }
    list = list.filter((p) => p.price <= maxPrice);

    if (sort === 'price_asc') list.sort((a, b) => a.price - b.price);
    if (sort === 'price_desc') list.sort((a, b) => b.price - a.price);
    if (sort === 'rating') list.sort((a, b) => b.rating - a.rating);
    if (sort === 'newest') list.sort((a, b) => Number(Boolean(b.isNew)) - Number(Boolean(a.isNew)));

    return list;
  }, [
    products,
    slug,
    queryText,
    gender,
    size,
    color,
    fit,
    maxPrice,
    sort,
    inStockOnly,
    heavyweightOnly,
  ]);

  const hasActiveFilters =
    gender !== 'all' ||
    size !== 'all' ||
    color !== 'all' ||
    fit !== 'all' ||
    maxPrice < 4500 ||
    inStockOnly ||
    heavyweightOnly ||
    Boolean(queryText);

  const resetFilters = () => {
    setGender('all');
    setSize('all');
    setColor('all');
    setFit('all');
    setMaxPrice(4500);
    setSort('featured');
    setInStockOnly(false);
    setHeavyweightOnly(false);
    if (queryText) setSearchParams({});
  };

  const recentProducts = getRecentProducts(products, undefined, 3);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#C5D1B8]">
        <div>
          <p className="text-xs font-medium text-[#4D5A48]">
            Wicked Catalog · <span className="tabular-nums">{filtered.length}</span> pieces
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold mt-1">{heading}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className="px-4 py-2 rounded-md bg-[#E7ECE0] border border-[#C5D1B8] text-sm font-semibold inline-flex items-center gap-2 hover:bg-[#9CAF88] transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>{filtersOpen ? 'Hide Filters' : 'Filters'}</span>
          </button>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort products"
            className="px-3.5 py-2 rounded-md bg-[#FCFBF7] border border-[#C5D1B8] text-sm font-medium text-[#1F2A1C]"
          >
            <option value="featured">Sort: Featured</option>
            <option value="newest">Sort: Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rating">Top Rated</option>
          </select>
        </div>
      </div>

      {/* Category Switcher Bar */}
      <div className="flex items-center gap-2 overflow-x-auto py-3.5 border-b border-[#CFD9C3]">
        {CATEGORY_TABS.map((cat) => (
          <Link
            key={cat.slug}
            to={`/collections/${cat.slug}`}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
              slug === cat.slug
                ? 'bg-[#9CAF88] text-[#1F2A1C]'
                : 'bg-[#FCFBF7] border border-[#C5D1B8] text-[#4D5A48] hover:text-[#1F2A1C]'
            }`}
          >
            {cat.label}
          </Link>
        ))}
      </div>

      {/* Gender & Quick E-Commerce Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-4">
        <div className="flex flex-wrap gap-1.5 items-center">
          {[
            { id: 'all', label: 'All Fits' },
            { id: 'men', label: 'For Men' },
            { id: 'women', label: 'For Women' },
            { id: 'unisex', label: 'Unisex' },
          ].map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setGender(g.id)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                gender === g.id
                  ? 'bg-[#9CAF88] text-[#1F2A1C]'
                  : 'bg-[#E7ECE0] text-[#4D5A48] hover:text-[#1F2A1C]'
              }`}
            >
              {g.label}
            </button>
          ))}

          <span className="text-[#C5D1B8] mx-1" aria-hidden="true">|</span>

          <button
            type="button"
            onClick={() => setInStockOnly((v) => !v)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              inStockOnly
                ? 'bg-[#9CAF88] text-[#1F2A1C]'
                : 'bg-[#FCFBF7] border border-[#C5D1B8] text-[#4D5A48] hover:text-[#1F2A1C]'
            }`}
          >
            In Stock Only
          </button>

          <button
            type="button"
            onClick={() => setHeavyweightOnly((v) => !v)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              heavyweightOnly
                ? 'bg-[#9CAF88] text-[#1F2A1C]'
                : 'bg-[#FCFBF7] border border-[#C5D1B8] text-[#4D5A48] hover:text-[#1F2A1C]'
            }`}
          >
            Heavyweight 280+ GSM
          </button>

          <button
            type="button"
            onClick={() => setMaxPrice((p) => (p === 1999 ? 4500 : 1999))}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors tabular-nums ${
              maxPrice <= 1999
                ? 'bg-[#9CAF88] text-[#1F2A1C]'
                : 'bg-[#FCFBF7] border border-[#C5D1B8] text-[#4D5A48] hover:text-[#1F2A1C]'
            }`}
          >
            Under ₹1,999
          </button>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs font-semibold underline text-[#1F2A1C]"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Removable Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 pb-5">
          {size !== 'all' && (
            <button
              type="button"
              onClick={() => setSize('all')}
              className="px-2.5 py-1 rounded bg-[#E7ECE0] border border-[#C5D1B8] text-xs font-medium inline-flex items-center gap-1"
            >
              <span>Size: {size}</span>
              <X className="w-3 h-3" />
            </button>
          )}
          {color !== 'all' && (
            <button
              type="button"
              onClick={() => setColor('all')}
              className="px-2.5 py-1 rounded bg-[#E7ECE0] border border-[#C5D1B8] text-xs font-medium inline-flex items-center gap-1"
            >
              <span>Colour: {color}</span>
              <X className="w-3 h-3" />
            </button>
          )}
          {fit !== 'all' && (
            <button
              type="button"
              onClick={() => setFit('all')}
              className="px-2.5 py-1 rounded bg-[#E7ECE0] border border-[#C5D1B8] text-xs font-medium inline-flex items-center gap-1"
            >
              <span>Fit: {fit}</span>
              <X className="w-3 h-3" />
            </button>
          )}
          {maxPrice < 4500 && (
            <button
              type="button"
              onClick={() => setMaxPrice(4500)}
              className="px-2.5 py-1 rounded bg-[#E7ECE0] border border-[#C5D1B8] text-xs font-medium inline-flex items-center gap-1 tabular-nums"
            >
              <span>Under ₹{maxPrice.toLocaleString('en-IN')}</span>
              <X className="w-3 h-3" />
            </button>
          )}
          {queryText && (
            <button
              type="button"
              onClick={() => setSearchParams({})}
              className="px-2.5 py-1 rounded bg-[#E7ECE0] border border-[#C5D1B8] text-xs font-medium inline-flex items-center gap-1"
            >
              <span>Query: {queryText}</span>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {filtersOpen && (
        <div className="mb-8 p-5 rounded-lg bg-[#E7ECE0]/60 border border-[#C5D1B8] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" htmlFor="filter-size">
              Size
            </label>
            <select
              id="filter-size"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-[#F7F5EF] border border-[#C5D1B8] text-sm"
            >
              <option value="all">All Sizes</option>
              {['S', 'M', 'L', 'XL', 'XXL', 'One Size'].map((sz) => (
                <option key={sz} value={sz}>
                  {sz}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" htmlFor="filter-color">
              Colourway
            </label>
            <select
              id="filter-color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-[#F7F5EF] border border-[#C5D1B8] text-sm"
            >
              <option value="all">All Colours</option>
              {allColors.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" htmlFor="filter-fit">
              Fit Block
            </label>
            <select
              id="filter-fit"
              value={fit}
              onChange={(e) => setFit(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-[#F7F5EF] border border-[#C5D1B8] text-sm"
            >
              <option value="all">All Fits</option>
              {allFits.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5 tabular-nums" htmlFor="filter-price">
              Max Price: ₹{maxPrice.toLocaleString('en-IN')}
            </label>
            <input
              id="filter-price"
              type="range"
              min={900}
              max={4500}
              step={100}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-[#1F2A1C]"
            />
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="py-16 text-center border border-[#C5D1B8] rounded-lg bg-[#FCFBF7]">
          <p className="font-display text-xl font-bold">No matching pieces found</p>
          <p className="text-sm text-[#4D5A48] mt-2">
            Try clearing a size or colour filter to explore more of Wicked.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-5 px-5 py-2.5 rounded-md bg-[#9CAF88] text-[#1F2A1C] font-semibold"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {recentProducts.length > 0 && (
        <section className="mt-16 pt-10 border-t border-[#C5D1B8]">
          <h2 className="font-display text-2xl font-bold mb-6">Recently Viewed</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
