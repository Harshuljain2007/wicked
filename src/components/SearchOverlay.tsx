import { Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SEED_PRODUCTS } from '../data/seedData';
import type { Product } from '../types';

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
  products?: Product[];
}

export function SearchOverlay({ open, onClose, products = SEED_PRODUCTS }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      window.setTimeout(() => inputRef.current?.focus(), 60);
    } else {
      setQuery('');
    }
  }, [open]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 5);
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.fabric.toLowerCase().includes(q) ||
          p.fit.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [query, products]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onClose();
    navigate(`/collections/all?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#1F2A1C]/40 flex items-start justify-center pt-16 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Search Wicked catalog"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#F7F5EF] border border-[#C5D1B8] rounded-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="flex items-center gap-3 pb-4 border-b border-[#CFD9C3]">
          <Search className="w-5 h-5 text-[#4D5A48] shrink-0" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search kurtas, 420 GSM hoodies, boxy tees..."
            className="flex-1 bg-transparent text-base text-[#1F2A1C] placeholder:text-[#4D5A48] focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="p-2 rounded-md text-[#1F2A1C] hover:bg-[#E7ECE0]"
          >
            <X className="w-5 h-5" />
          </button>
        </form>

        <div className="mt-4">
          <p className="text-xs font-medium text-[#4D5A48] mb-3">
            {query.trim() ? 'Matching Garments' : 'Popular Searches'}
          </p>
          {suggestions.length === 0 ? (
            <p className="text-sm text-[#4D5A48] py-4">
              No pieces matched &ldquo;{query}&rdquo;. Try searching &ldquo;Kurta&rdquo;, &ldquo;Hoodie&rdquo;, or &ldquo;280 GSM&rdquo;.
            </p>
          ) : (
            <ul className="divide-y divide-[#CFD9C3]">
              {suggestions.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate(`/product/${item.slug}`);
                    }}
                    className="w-full py-3 flex items-center justify-between gap-4 text-left hover:bg-[#E7ECE0] px-2 rounded transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={item.colors[0].images[0]}
                        alt={item.name}
                        width={44}
                        height={54}
                        className="w-11 h-14 object-cover rounded border border-[#C5D1B8] shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <p className="font-display text-sm font-semibold text-[#1F2A1C] truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-[#4D5A48]">
                          {item.category} · {item.gsm} GSM · {item.fit}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold tabular-nums shrink-0">
                      ₹{item.price.toLocaleString('en-IN')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
