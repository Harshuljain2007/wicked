import {
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  Minus,
  Plus,
  Ruler,
  Share2,
  Star,
  Truck,
  ZoomIn,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { SizeGuideModal } from '../components/SizeGuideModal';
import { lookupIndianPincode, SEED_PRODUCTS, SEED_REVIEWS } from '../data/seedData';
import { useAuth } from '../hooks/useAuth';
import { useBag } from '../hooks/useBag';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import { useReducedMotion } from '../hooks/useReducedMotion';
import {
  getStaticProducts,
  getStaticReviews,
  staticSubmitReview,
  tryApiJson,
} from '../lib/staticStore';
import type { Product, Review } from '../types';

export function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToBag, toggleWishlist, isWishlisted } = useBag();
  const { user, getAuthToken } = useAuth();
  const { shouldSimplify } = useReducedMotion();

  const [product, setProduct] = useState<Product | null>(
    () => SEED_PRODUCTS.find((p) => p.slug === slug || p.id === slug) || null
  );
  const [reviews, setReviews] = useState<Review[]>(() =>
    SEED_REVIEWS.filter((r) => r.productId === (product?.id || ''))
  );
  const [colorIdx, setColorIdx] = useState(0);
  const [imgIdx, setImgIdx] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [infoTab, setInfoTab] = useState<'fabric' | 'fit' | 'shipping'>('fabric');
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifySubmitted, setNotifySubmitted] = useState(false);
  const { recordView, getProducts: getRecentProducts } = useRecentlyViewed();

  const [pincode, setPincode] = useState('');
  const [pincodeInfo, setPincodeInfo] = useState<{
    city: string;
    state: string;
    estimatedDays: number;
    codAvailable: boolean;
  } | null>(null);
  const [pincodeError, setPincodeError] = useState('');

  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewMsg, setReviewMsg] = useState('');

  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    tryApiJson<{ product?: Product; reviews?: Review[] }>(
      `/api/products/${encodeURIComponent(slug || '')}`
    ).then((api) => {
      if (api.available && api.ok && api.data?.product) {
        setProduct(api.data.product);
        setReviews(api.data.reviews || []);
        setColorIdx(0);
        setImgIdx(0);
        setQuantity(1);
        return;
      }
      const fallbackProd = getStaticProducts().find((p) => p.slug === slug || p.id === slug);
      if (fallbackProd) {
        setProduct(fallbackProd);
        setReviews(getStaticReviews(fallbackProd.id));
        setColorIdx(0);
        setImgIdx(0);
        setQuantity(1);
      }
    });
  }, [slug]);

  useEffect(() => {
    if (product?.id) {
      recordView(product.id);
      setNotifySubmitted(false);
    }
  }, [product?.id, recordView]);

  const activeColor = product?.colors[colorIdx] || product?.colors[0];
  const images = activeColor?.images || [];
  const price = product ? product.price + (activeColor?.priceDelta || 0) : 0;

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

  const activeVariant = sizesForColor.find((v) => v.size === selectedSize) || sizesForColor[0];
  const stock = activeVariant?.stock ?? 0;

  useDocumentMeta({
    title: product ? `${product.name} — Wicked` : 'Product — Wicked',
    description: product?.description || 'Wicked Indian streetwear and ethnic fusion.',
    jsonLd: product
      ? {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.name,
          description: product.description,
          brand: { '@type': 'Brand', name: 'Wicked' },
          offers: {
            '@type': 'Offer',
            priceCurrency: 'INR',
            price: String(price),
            availability: stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          },
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: String(product.rating),
            reviewCount: String(Math.max(1, reviews.length || product.reviewCount)),
          },
        }
      : null,
  });

  if (!product || !activeColor) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Garment not found</h1>
        <Link
          to="/collections/all"
          className="inline-block mt-4 px-5 py-2.5 bg-[#9CAF88] rounded-md font-semibold"
        >
          Back to Catalog
        </Link>
      </div>
    );
  }

  const handleAdd = (e: React.MouseEvent<HTMLButtonElement>, goCheckout = false) => {
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
        image: images[0],
      },
      {
        openDrawer: !goCheckout,
        sourceRect: e.currentTarget.getBoundingClientRect(),
      }
    );
    if (goCheckout) {
      navigate('/checkout');
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, url: shareUrl });
        return;
      }
    } catch {
      // Fallback to clipboard copy
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Ignore clipboard permissions
    }
  };

  const relatedProducts = SEED_PRODUCTS.filter((p) => p.id !== product.id)
    .sort((a, b) => Number(b.category !== product.category) - Number(a.category !== product.category))
    .slice(0, 3);
  const recentProducts = getRecentProducts(SEED_PRODUCTS, product.id, 3);

  const handleCheckPincode = async (e: React.FormEvent) => {
    e.preventDefault();
    setPincodeError('');
    setPincodeInfo(null);
    const pin = pincode.trim();
    try {
      const res = await fetch(`/api/pincode/${encodeURIComponent(pin)}`);
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (!res.ok) {
          setPincodeError(data.error || 'Enter a valid 6-digit Indian pincode.');
          return;
        }
        setPincodeInfo(data);
        return;
      }
    } catch {
      // Fall back to local Indian pincode lookup on static hosts
    }
    const local = lookupIndianPincode(pin);
    if (!local) {
      setPincodeError('Enter a valid 6-digit Indian pincode.');
      return;
    }
    setPincodeInfo(local);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewMsg('');
    const token = await getAuthToken();
    if (!token || !user) {
      setReviewMsg('Please sign in on the Account page to post a review.');
      return;
    }
    const api = await tryApiJson<{ review?: Review; error?: string }>('/api/orders/reviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        productId: product.id,
        authorName: user?.displayName || 'Wicked Member',
        rating: reviewRating,
        title: reviewTitle,
        body: reviewBody,
      }),
    });

    if (api.available) {
      if (!api.ok || !api.data.review) {
        setReviewMsg(api.data.error || 'Could not submit review.');
        return;
      }
      setReviews((prev) => [api.data.review!, ...prev]);
      setReviewTitle('');
      setReviewBody('');
      setReviewMsg('Review published.');
      return;
    }

    const review = await staticSubmitReview(
      {
        productId: product.id,
        authorName: user.displayName || 'Wicked Member',
        rating: reviewRating,
        title: reviewTitle,
        body: reviewBody,
      },
      user
    );
    setReviews((prev) => [review, ...prev]);
    setReviewTitle('');
    setReviewBody('');
    setReviewMsg('Review published.');
  };

  const estimatedDateStr = pincodeInfo
    ? new Date(Date.now() + pincodeInfo.estimatedDays * 86400000).toLocaleDateString('en-IN', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : '';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-28 md:pb-12">
      <nav aria-label="Breadcrumb" className="text-xs text-[#4D5A48] mb-6 flex items-center gap-2">
        <Link to="/" className="hover:underline">Home</Link>
        <span>/</span>
        <Link to={`/collections/${product.category}`} className="hover:underline capitalize">
          {product.category}
        </Link>
        <span>/</span>
        <span className="text-[#1F2A1C] font-medium truncate">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left: Sticky Swipeable & Zoomable Gallery */}
        <div className="lg:col-span-7 lg:sticky lg:top-24 space-y-4">
          <div
            className="relative aspect-[3/4] bg-[#FCFBF7] border border-[#C5D1B8] rounded-lg overflow-hidden select-none"
            onTouchStart={(e) => {
              touchStartX.current = e.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(e) => {
              if (touchStartX.current === null || images.length <= 1) return;
              const diff = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
              if (Math.abs(diff) > 40) {
                setImgIdx((i) =>
                  diff < 0 ? (i + 1) % images.length : (i - 1 + images.length) % images.length
                );
              }
              touchStartX.current = null;
            }}
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={`${activeColor.name}-${imgIdx}`}
                src={images[imgIdx] || images[0]}
                alt={`${product.name} in ${activeColor.name}`}
                width={800}
                height={1066}
                referrerPolicy="no-referrer"
                onClick={() => setZoomed((z) => !z)}
                initial={shouldSimplify ? { opacity: 0 } : { opacity: 0, scale: 0.985 }}
                animate={{ opacity: 1, scale: zoomed ? 1.25 : 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className={`w-full h-full object-cover ${
                  zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
                }`}
              />
            </AnimatePresence>

            <button
              type="button"
              onClick={() => setZoomed((z) => !z)}
              aria-label={zoomed ? 'Reset zoom' : 'Zoom image'}
              className="absolute top-3 right-3 w-10 h-10 rounded-full bg-[#F7F5EF]/90 border border-[#C5D1B8] flex items-center justify-center"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setImgIdx((i) => (i - 1 + images.length) % images.length)}
                  aria-label="Previous image"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#F7F5EF]/90 border border-[#C5D1B8] flex items-center justify-center"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setImgIdx((i) => (i + 1) % images.length)}
                  aria-label="Next image"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#F7F5EF]/90 border border-[#C5D1B8] flex items-center justify-center"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto">
              {images.map((src, idx) => (
                <button
                  key={`${src}-${idx}`}
                  type="button"
                  onClick={() => setImgIdx(idx)}
                  className={`w-20 aspect-[3/4] rounded-md overflow-hidden border shrink-0 ${
                    idx === imgIdx ? 'border-[#1F2A1C] ring-1 ring-[#1F2A1C]' : 'border-[#C5D1B8]'
                  }`}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Contiguous Purchase Module */}
        <div className="lg:col-span-5 space-y-6 bg-[#FCFBF7] border border-[#C5D1B8] rounded-lg p-6 sm:p-8">
          <div>
            <p className="text-xs text-[#4D5A48]">
              {product.category} · {product.gsm} GSM · {product.fit}
            </p>
            <div className="flex items-start justify-between gap-3 mt-1">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1F2A1C]">
                {product.name}
              </h1>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleShare}
                  aria-label="Share product link"
                  title={copiedLink ? 'Link copied' : 'Share link'}
                  className="p-2.5 rounded-md border border-[#C5D1B8] hover:bg-[#E7ECE0]"
                >
                  {copiedLink ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
                </button>
                <button
                  type="button"
                  onClick={() => toggleWishlist(product.id)}
                  aria-label="Toggle wishlist"
                  className="p-2.5 rounded-md border border-[#C5D1B8] hover:bg-[#E7ECE0]"
                >
                  <Heart
                    className={`w-5 h-5 ${isWishlisted(product.id) ? 'fill-[#1F2A1C]' : ''}`}
                  />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2 text-sm">
              <div className="flex items-center gap-1 font-semibold tabular-nums">
                <Star className="w-4 h-4 fill-[#1F2A1C]" />
                <span>{product.rating.toFixed(1)}</span>
              </div>
              <span className="text-[#4D5A48]">({reviews.length || product.reviewCount} reviews)</span>
            </div>

            <div className="flex items-baseline gap-3 mt-4 tabular-nums">
              <span className="font-display text-3xl font-bold text-[#1F2A1C]">
                ₹{price.toLocaleString('en-IN')}
              </span>
              {product.compareAtPrice && product.compareAtPrice > price && (
                <span className="text-base text-[#4D5A48] line-through">
                  ₹{product.compareAtPrice.toLocaleString('en-IN')}
                </span>
              )}
              <span className="text-xs text-[#4D5A48]">Inclusive of all GST</span>
            </div>
          </div>

          <p className="text-sm text-[#4D5A48] leading-relaxed">{product.description}</p>

          {/* Colour Picker */}
          <div>
            <p className="text-xs font-semibold mb-2">
              Colour: <span className="font-normal text-[#4D5A48]">{activeColor.name}</span>
            </p>
            <div className="flex flex-wrap gap-2.5">
              {product.colors.map((c, idx) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => {
                    setColorIdx(idx);
                    setImgIdx(0);
                  }}
                  className={`px-3 py-2 rounded-md border text-xs font-semibold inline-flex items-center gap-2 ${
                    idx === colorIdx
                      ? 'bg-[#9CAF88] border-[#1F2A1C] text-[#1F2A1C]'
                      : 'bg-[#F7F5EF] border-[#C5D1B8] text-[#4D5A48]'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-[#1F2A1C]/30"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Animated Size Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold">
                Size:{' '}
                <span className="font-normal text-[#4D5A48]">
                  {stock > 0
                    ? stock <= 4
                      ? `Only ${stock} left in stock`
                      : `${stock} ready to ship`
                    : 'Out of stock'}
                </span>
              </p>
              <button
                type="button"
                onClick={() => setSizeGuideOpen(true)}
                className="text-xs font-semibold underline inline-flex items-center gap-1"
              >
                <Ruler className="w-3.5 h-3.5" />
                <span>Size guide</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {sizesForColor.map((variant) => {
                const selected = variant.size === activeVariant?.size;
                return (
                  <motion.button
                    key={variant.sku}
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    disabled={variant.stock <= 0}
                    onClick={() => setSelectedSize(variant.size)}
                    className={`min-w-[48px] h-11 px-3 rounded-md border text-sm font-semibold tabular-nums transition-colors ${
                      selected
                        ? 'bg-[#9CAF88] border-[#1F2A1C] text-[#1F2A1C]'
                        : variant.stock <= 0
                        ? 'bg-[#F7F5EF] border-[#CFD9C3] text-[#4D5A48]/40 line-through'
                        : 'bg-[#F7F5EF] border-[#C5D1B8] text-[#1F2A1C] hover:bg-[#E7ECE0]'
                    }`}
                  >
                    {variant.size}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Quantity & Tomato Red Primary Action Buttons */}
          {stock > 0 ? (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Quantity</span>
                <div className="inline-flex items-center border border-[#C5D1B8] rounded-md bg-[#F7F5EF]">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    className="p-2 hover:bg-[#E7ECE0]"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-4 text-sm font-semibold tabular-nums">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(stock, 10, q + 1))}
                    aria-label="Increase quantity"
                    className="p-2 hover:bg-[#E7ECE0]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={(e) => handleAdd(e, false)}
                  className="py-3.5 px-5 rounded-md btn-tomato text-center"
                >
                  Add to bag
                </button>
                <button
                  type="button"
                  onClick={(e) => handleAdd(e, true)}
                  className="py-3.5 px-5 rounded-md btn-tomato text-center"
                >
                  Buy now
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-md bg-[#E7ECE0] border border-[#C5D1B8] space-y-2.5">
              <p className="text-xs font-semibold text-[#1F2A1C]">
                {activeColor.name} / {selectedSize} is temporarily sold out.
              </p>
              {notifySubmitted ? (
                <p className="text-xs text-[#4D5A48]">
                  Restock alert registered for {notifyEmail}. We&apos;ll email you when the next Jaipur batch arrives.
                </p>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (notifyEmail.trim()) setNotifySubmitted(true);
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="email"
                    required
                    value={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.value)}
                    placeholder="Email for restock alert"
                    className="flex-1 px-3 py-2 text-xs bg-[#F7F5EF] border border-[#C5D1B8] rounded-md"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 text-xs font-bold bg-[#9CAF88] rounded-md hover:bg-[#8EA379]"
                  >
                    Notify me
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Pincode Delivery Checker */}
          <div className="pt-4 border-t border-[#CFD9C3]">
            <form onSubmit={handleCheckPincode} className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 6-digit pincode"
                aria-label="Check delivery pincode"
                className="flex-1 px-3 py-2 text-sm bg-[#F7F5EF] border border-[#C5D1B8] rounded-md tabular-nums"
              />
              <button
                type="submit"
                className="px-4 py-2 text-sm font-semibold bg-[#E7ECE0] border border-[#C5D1B8] rounded-md hover:bg-[#9CAF88] transition-colors"
              >
                Check
              </button>
            </form>
            {pincodeError && <p className="text-xs text-[#4D5A48] mt-2">{pincodeError}</p>}
            {pincodeInfo && (
              <div className="mt-2.5 text-xs text-[#1F2A1C] flex items-start gap-2 bg-[#E7ECE0] p-3 rounded-md">
                <Truck className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">
                    Delivers to {pincodeInfo.city}, {pincodeInfo.state} by {estimatedDateStr}
                  </p>
                  <p className="text-[#4D5A48] mt-0.5">
                    {pincodeInfo.codAvailable ? 'Cash on Delivery available' : 'Prepaid only'} · Free 7-day size exchange
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Spec & Policy Tabs */}
          <div className="pt-4 border-t border-[#CFD9C3] space-y-3">
            <div className="flex gap-1.5 border-b border-[#CFD9C3] pb-2" role="tablist">
              {[
                { id: 'fabric', label: 'Fabric & Care' },
                { id: 'fit', label: 'Fit Notes' },
                { id: 'shipping', label: 'Delivery & Returns' },
              ].map((tab) => {
                const isActive = infoTab === tab.id;
                return (
                  <motion.button
                    key={tab.id}
                    type="button"
                    role="tab"
                    whileTap={shouldSimplify ? undefined : { scale: 0.95 }}
                    aria-selected={isActive}
                    onClick={() => setInfoTab(tab.id as typeof infoTab)}
                    className={`relative px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                      isActive ? 'text-[#1F2A1C]' : 'text-[#4D5A48] hover:text-[#1F2A1C]'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="wicked-pdp-info-tab"
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                        className="absolute inset-0 bg-[#9CAF88] rounded"
                      />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                  </motion.button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={infoTab}
                initial={shouldSimplify ? { opacity: 0 } : { opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              >
                {infoTab === 'fabric' && (
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-[#4D5A48]">Fabric</dt>
                      <dd className="font-medium text-right">{product.fabric}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-[#4D5A48]">Weight</dt>
                      <dd className="font-medium tabular-nums">{product.gsm} GSM</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-[#4D5A48]">Care</dt>
                      <dd className="font-medium text-right">{product.care}</dd>
                    </div>
                  </dl>
                )}

                {infoTab === 'fit' && (
                  <div className="text-xs text-[#4D5A48] leading-relaxed space-y-1.5">
                    <p>
                      <strong className="text-[#1F2A1C]">{product.fit}:</strong> Engineered for Indian climate drape with breathable ease across chest and shoulders.
                    </p>
                    <p>Pre-shrunk enzyme wash limits post-wash shrinkage to under 1.5%.</p>
                  </div>
                )}

                {infoTab === 'shipping' && (
                  <div className="text-xs text-[#4D5A48] leading-relaxed space-y-1.5">
                    <p>Free pan-India shipping above ₹1,499 (₹79 flat under threshold). Cash on Delivery supported.</p>
                    <p>7-day doorstep size exchange on unworn garments with tags intact.</p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Verified Buyer Reviews */}
      <section className="mt-16 pt-12 border-t border-[#C5D1B8] grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5">
          <h2 className="font-display text-2xl font-bold">Customer Reviews</h2>
          <p className="text-sm text-[#4D5A48] mt-1">
            Rated <span className="font-semibold text-[#1F2A1C] tabular-nums">{product.rating.toFixed(1)}</span> out of 5 across verified Indian orders.
          </p>

          <form onSubmit={handleSubmitReview} className="mt-6 space-y-3 bg-[#FCFBF7] border border-[#C5D1B8] p-5 rounded-lg">
            <h3 className="font-display text-base font-bold">Write a Review</h3>
            <div>
              <label className="block text-xs font-medium mb-1" htmlFor="rev-rating">
                Rating
              </label>
              <select
                id="rev-rating"
                value={reviewRating}
                onChange={(e) => setReviewRating(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-[#F7F5EF] border border-[#C5D1B8] rounded-md"
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} Stars
                  </option>
                ))}
              </select>
            </div>
            <input
              type="text"
              required
              value={reviewTitle}
              onChange={(e) => setReviewTitle(e.target.value)}
              placeholder="Headline (e.g. Heavyweight drape is spot-on)"
              className="w-full px-3 py-2 text-sm bg-[#F7F5EF] border border-[#C5D1B8] rounded-md"
            />
            <textarea
              required
              rows={3}
              value={reviewBody}
              onChange={(e) => setReviewBody(e.target.value)}
              placeholder="Share fit, fabric weight, and wash feedback..."
              className="w-full px-3 py-2 text-sm bg-[#F7F5EF] border border-[#C5D1B8] rounded-md"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#9CAF88] text-[#1F2A1C] font-semibold text-sm rounded-md hover:bg-[#8EA379] transition-colors"
            >
              Post Review
            </button>
            {reviewMsg && <p className="text-xs text-[#4D5A48]">{reviewMsg}</p>}
          </form>
        </div>

        <div className="lg:col-span-7 space-y-4">
          {reviews.length === 0 ? (
            <div className="p-6 border border-[#C5D1B8] rounded-lg bg-[#FCFBF7]">
              <p className="text-sm text-[#4D5A48]">Be the first to review {product.name}.</p>
            </div>
          ) : (
            reviews.map((rev) => (
              <article key={rev.id} className="p-5 border border-[#C5D1B8] rounded-lg bg-[#FCFBF7]">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{rev.authorName}</span>
                    {rev.verifiedBuyer && (
                      <span className="text-xs text-[#4D5A48] inline-flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Verified Buyer</span>
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold tabular-nums">{rev.rating} / 5</span>
                </div>
                <h4 className="font-display text-base font-bold mt-2">{rev.title}</h4>
                <p className="text-sm text-[#4D5A48] mt-1 leading-relaxed">{rev.body}</p>
              </article>
            ))
          )}
        </div>
      </section>

      {/* Complete the Look / Related Pieces */}
      <section className="mt-16 pt-12 border-t border-[#C5D1B8]">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-medium text-[#4D5A48]">Styled Together</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold mt-1">
              Complete the Look
            </h2>
          </div>
          <Link to="/collections/all" className="text-xs font-semibold underline">
            Browse all
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {relatedProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Recently Viewed Shelf */}
      {recentProducts.length > 0 && (
        <section className="mt-14 pt-10 border-t border-[#C5D1B8]">
          <h2 className="font-display text-2xl font-bold mb-6">Recently Viewed</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Mobile Sticky Bottom Add to Bag Bar (<= 15% mobile viewport height) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#F7F5EF] border-t border-[#C5D1B8] px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold truncate">{product.name}</p>
          <p className="text-sm font-bold tabular-nums">₹{price.toLocaleString('en-IN')}</p>
        </div>
        <button
          type="button"
          disabled={stock <= 0}
          onClick={(e) => handleAdd(e, false)}
          className="px-6 py-2.5 rounded-md btn-tomato whitespace-nowrap shrink-0"
        >
          Add to bag
        </button>
      </div>

      <SizeGuideModal
        open={sizeGuideOpen}
        onClose={() => setSizeGuideOpen(false)}
        category={product.category}
      />
    </div>
  );
}
