import { Heart, Minus, Plus, Star, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBag } from '../hooks/useBag';
import type { Product } from '../types';

interface QuickViewModalProps {
  product: Product | null;
  initialColorIdx?: number;
  onClose: () => void;
}

export function QuickViewModal({
  product,
  initialColorIdx = 0,
  onClose,
}: QuickViewModalProps) {
  const navigate = useNavigate();
  const { addToBag, toggleWishlist, isWishlisted } = useBag();
  const [colorIdx, setColorIdx] = useState(initialColorIdx);
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setColorIdx(initialColorIdx);
    setQuantity(1);
    setSelectedSize('');
  }, [product, initialColorIdx]);

  useEffect(() => {
    if (!product) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [product, onClose]);

  const activeColor = product?.colors[colorIdx] || product?.colors[0];

  const sizesForColor = useMemo(() => {
    if (!product || !activeColor) return [];
    return product.variants.filter((v) => v.color === activeColor.name);
  }, [product, activeColor]);

  useEffect(() => {
    if (sizesForColor.length > 0 && !sizesForColor.some((s) => s.size === selectedSize)) {
      const inStock = sizesForColor.find((s) => s.stock > 0) || sizesForColor[0];
      setSelectedSize(inStock.size);
    }
  }, [sizesForColor, selectedSize]);

  if (!product || !activeColor) return null;

  const activeVariant = sizesForColor.find((v) => v.size === selectedSize) || sizesForColor[0];
  const stock = activeVariant?.stock ?? 0;
  const price = product.price + (activeColor.priceDelta || 0);
  const wished = isWishlisted(product.id);

  const handleAddToBag = (e: React.MouseEvent<HTMLButtonElement>, goCheckout = false) => {
    if (stock <= 0) return;
    addToBag(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        category: product.category,
        color: activeColor.name,
        size: activeVariant?.size || selectedSize,
        unitPrice: price,
        quantity,
        image: activeColor.images[0],
      },
      {
        openDrawer: !goCheckout,
        sourceRect: e.currentTarget.getBoundingClientRect(),
      }
    );
    onClose();
    if (goCheckout) {
      navigate('/checkout');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#1F2A1C]/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Quick view ${product.name}`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-[#F7F5EF] border border-[#C5D1B8] rounded-lg overflow-hidden grid grid-cols-1 md:grid-cols-12 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="md:col-span-5 bg-[#FCFBF7] aspect-[3/4] md:aspect-auto">
          <img
            src={activeColor.images[0]}
            alt={`${product.name} in ${activeColor.name}`}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="md:col-span-7 p-6 sm:p-7 flex flex-col justify-between gap-5">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-[#4D5A48]">
                  {product.category} · {product.gsm} GSM · {product.fit}
                </p>
                <h2 className="font-display text-2xl font-bold text-[#1F2A1C] mt-1">
                  {product.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close quick view"
                className="p-2 rounded-md text-[#1F2A1C] hover:bg-[#E7ECE0]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-baseline gap-2.5 tabular-nums">
                <span className="font-display text-2xl font-bold text-[#1F2A1C]">
                  ₹{price.toLocaleString('en-IN')}
                </span>
                {product.compareAtPrice && product.compareAtPrice > price && (
                  <span className="text-sm text-[#4D5A48] line-through">
                    ₹{product.compareAtPrice.toLocaleString('en-IN')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold tabular-nums">
                <Star className="w-3.5 h-3.5 fill-[#1F2A1C]" />
                <span>{product.rating.toFixed(1)}</span>
                <span className="text-[#4D5A48] font-normal">({product.reviewCount})</span>
              </div>
            </div>

            <p className="text-sm text-[#4D5A48] leading-relaxed">{product.description}</p>

            {/* Colourway Picker */}
            <div>
              <p className="text-xs font-semibold mb-2">
                Colour: <span className="font-normal text-[#4D5A48]">{activeColor.name}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((c, idx) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setColorIdx(idx)}
                    className={`px-3 py-1.5 rounded-md border text-xs font-semibold inline-flex items-center gap-2 ${
                      idx === colorIdx
                        ? 'bg-[#9CAF88] border-[#1F2A1C] text-[#1F2A1C]'
                        : 'bg-[#FCFBF7] border-[#C5D1B8] text-[#4D5A48]'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-[#1F2A1C]/30"
                      style={{ backgroundColor: c.hex }}
                    />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Size Selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold">
                  Size:{' '}
                  <span className="font-normal text-[#4D5A48]">
                    {stock > 0 ? `${stock} in stock` : 'Sold out'}
                  </span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {sizesForColor.map((v) => {
                  const selected = v.size === activeVariant?.size;
                  return (
                    <button
                      key={v.sku}
                      type="button"
                      disabled={v.stock <= 0}
                      onClick={() => setSelectedSize(v.size)}
                      className={`min-w-[44px] h-10 px-3 rounded-md border text-xs font-semibold tabular-nums ${
                        selected
                          ? 'bg-[#9CAF88] border-[#1F2A1C] text-[#1F2A1C]'
                          : v.stock <= 0
                          ? 'bg-[#F7F5EF] border-[#CFD9C3] text-[#4D5A48]/40 line-through'
                          : 'bg-[#FCFBF7] border-[#C5D1B8] text-[#1F2A1C] hover:bg-[#E7ECE0]'
                      }`}
                    >
                      {v.size}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantity & Wishlist */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="inline-flex items-center border border-[#C5D1B8] rounded-md bg-[#FCFBF7]">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  className="p-2 hover:bg-[#E7ECE0]"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="px-3 text-sm font-semibold tabular-nums">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(Math.max(1, stock), 10, q + 1))}
                  aria-label="Increase quantity"
                  className="p-2 hover:bg-[#E7ECE0]"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => toggleWishlist(product.id)}
                className="px-3 py-2 rounded-md border border-[#C5D1B8] bg-[#FCFBF7] hover:bg-[#E7ECE0] text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Heart className={`w-3.5 h-3.5 ${wished ? 'fill-[#1F2A1C]' : ''}`} />
                <span>{wished ? 'Saved' : 'Save'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-2.5 pt-2 border-t border-[#CFD9C3]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={stock <= 0}
                onClick={(e) => handleAddToBag(e, false)}
                className="py-3 px-4 rounded-md btn-tomato text-center"
              >
                Add to bag
              </button>
              <button
                type="button"
                disabled={stock <= 0}
                onClick={(e) => handleAddToBag(e, true)}
                className="py-3 px-4 rounded-md btn-tomato text-center"
              >
                Buy now
              </button>
            </div>
            <Link
              to={`/product/${product.slug}`}
              onClick={onClose}
              className="block text-center text-xs font-semibold text-[#1F2A1C] underline py-1"
            >
              View full product details, fabric care &amp; reviews
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
