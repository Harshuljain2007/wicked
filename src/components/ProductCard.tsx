import { Eye, Heart, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBag } from '../hooks/useBag';
import { useReducedMotion } from '../hooks/useReducedMotion';
import type { Product } from '../types';
import { QuickViewModal } from './QuickViewModal';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { toggleWishlist, isWishlisted, addToBag } = useBag();
  const { shouldSimplify } = useReducedMotion();
  const [colorIdx, setColorIdx] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  const activeColor = product.colors[colorIdx] || product.colors[0];
  const primaryImage = activeColor.images[0];
  const secondaryImage = activeColor.images[1] || primaryImage;
  const displayPrice = product.price + (activeColor.priceDelta || 0);
  const wished = isWishlisted(product.id);
  const sizesForColor = product.variants.filter((v) => v.color === activeColor.name);

  const handleQuickSizeAdd = (e: React.MouseEvent<HTMLButtonElement>, size: string) => {
    e.preventDefault();
    e.stopPropagation();
    addToBag(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        category: product.category,
        color: activeColor.name,
        size,
        unitPrice: displayPrice,
        quantity: 1,
        image: primaryImage,
      },
      { sourceRect: e.currentTarget.getBoundingClientRect() }
    );
  };

  return (
    <>
      <article
        className="group bg-[#FCFBF7] border border-[#C5D1B8] rounded-lg overflow-hidden flex flex-col transition-transform duration-200 hover:-translate-y-0.5"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="relative aspect-[3/4] bg-[#F7F5EF] overflow-hidden">
          <Link to={`/product/${product.slug}`} className="block w-full h-full">
            {imgError ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-[#E7ECE0] text-center">
                <span className="font-display text-lg font-semibold text-[#1F2A1C]">
                  {product.name}
                </span>
                <span className="text-xs text-[#4D5A48] mt-1">{activeColor.name}</span>
              </div>
            ) : (
              <>
                <img
                  src={primaryImage}
                  alt={`${product.name} in ${activeColor.name}`}
                  width={600}
                  height={800}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className={`w-full h-full object-cover transition-all duration-300 ${
                    hovered && secondaryImage !== primaryImage
                      ? 'opacity-0 scale-[1.03]'
                      : hovered
                      ? 'scale-[1.03]'
                      : 'opacity-100 scale-100'
                  }`}
                />
                {secondaryImage !== primaryImage && (
                  <img
                    src={secondaryImage}
                    alt={`${product.name} alternate view`}
                    width={600}
                    height={800}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${
                      hovered ? 'opacity-100 scale-[1.03]' : 'opacity-0 scale-100'
                    }`}
                  />
                )}
              </>
            )}
          </Link>

          <div className="absolute top-3 right-3 flex flex-col gap-2">
            <motion.button
              type="button"
              whileTap={shouldSimplify ? undefined : { scale: 0.85 }}
              onClick={() => toggleWishlist(product.id)}
              aria-label={
                wished ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`
              }
              className="w-10 h-10 rounded-full bg-[#F7F5EF]/90 border border-[#C5D1B8] flex items-center justify-center text-[#1F2A1C] hover:bg-[#9CAF88] transition-colors"
            >
              <motion.span
                key={wished ? 'wished' : 'unwished'}
                initial={shouldSimplify ? false : { scale: 0.7 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 520, damping: 18 }}
                className="inline-flex"
              >
                <Heart
                  className={`w-4 h-4 ${wished ? 'fill-[#1F2A1C]' : ''}`}
                />
              </motion.span>
            </motion.button>

            <motion.button
              type="button"
              whileTap={shouldSimplify ? undefined : { scale: 0.85 }}
              onClick={() => setQuickViewOpen(true)}
              aria-label={`Quick view ${product.name}`}
              title="Quick view"
              className="w-10 h-10 rounded-full bg-[#F7F5EF]/90 border border-[#C5D1B8] flex items-center justify-center text-[#1F2A1C] hover:bg-[#9CAF88] transition-colors"
            >
              <Eye className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Desktop Hover Quick-Add Size Bar */}
          {sizesForColor.length > 0 && (
            <div
              className={`hidden md:flex absolute inset-x-3 bottom-3 p-2 rounded-md bg-[#F7F5EF]/95 border border-[#C5D1B8] items-center justify-between gap-1.5 transition-all duration-200 ${
                hovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
              }`}
            >
              <span className="text-[11px] font-semibold text-[#4D5A48] pl-1 shrink-0">
                Quick add
              </span>
              <div className="flex items-center gap-1 flex-wrap justify-end">
                {sizesForColor.map((v) => (
                  <motion.button
                    key={v.sku}
                    type="button"
                    whileTap={shouldSimplify || v.stock <= 0 ? undefined : { scale: 0.88 }}
                    disabled={v.stock <= 0}
                    onClick={(e) => handleQuickSizeAdd(e, v.size)}
                    className={`min-w-[28px] h-7 px-1.5 rounded text-[11px] font-semibold tabular-nums transition-colors ${
                      v.stock <= 0
                        ? 'text-[#4D5A48]/40 line-through cursor-not-allowed'
                        : 'bg-[#E7ECE0] text-[#1F2A1C] hover:bg-[#9CAF88]'
                    }`}
                  >
                    {v.size === 'One Size' ? 'OS' : v.size}
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 flex-1 flex flex-col justify-between gap-3">
          <div>
            <p className="text-xs text-[#4D5A48] flex items-center flex-wrap gap-x-1">
              <span>{product.category}</span>
              <span aria-hidden="true">·</span>
              <span>{product.gsm} GSM</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-0.5 tabular-nums text-[#1F2A1C] font-medium">
                <Star className="w-3 h-3 fill-[#1F2A1C]" />
                {product.rating.toFixed(1)}
              </span>
              {product.isNew ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>New Drop</span>
                </>
              ) : product.onSale ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Archive Offer</span>
                </>
              ) : null}
            </p>
            <Link to={`/product/${product.slug}`} className="block mt-1">
              <h3 className="font-display text-base font-semibold text-[#1F2A1C] leading-snug hover:underline">
                {product.name}
              </h3>
            </Link>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-baseline gap-2 tabular-nums">
              <span className="text-[15px] font-bold text-[#1F2A1C]">
                ₹{displayPrice.toLocaleString('en-IN')}
              </span>
              {product.compareAtPrice && product.compareAtPrice > displayPrice && (
                <span className="text-xs text-[#4D5A48] line-through">
                  ₹{product.compareAtPrice.toLocaleString('en-IN')}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5" role="group" aria-label="Colour options">
              {product.colors.map((c, idx) => (
                <motion.button
                  key={c.name}
                  type="button"
                  whileTap={shouldSimplify ? undefined : { scale: 0.82 }}
                  onClick={() => setColorIdx(idx)}
                  aria-label={`${c.name} colourway`}
                  title={c.name}
                  className={`w-5 h-5 rounded-full border transition-transform ${
                    idx === colorIdx
                      ? 'border-[#1F2A1C] ring-1 ring-[#1F2A1C] ring-offset-1 scale-110'
                      : 'border-[#C5D1B8]'
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>
        </div>
      </article>

      <QuickViewModal
        product={quickViewOpen ? product : null}
        initialColorIdx={colorIdx}
        onClose={() => setQuickViewOpen(false)}
      />
    </>
  );
}
