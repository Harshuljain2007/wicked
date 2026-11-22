import { Heart, Minus, Plus, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SEED_PRODUCTS } from '../data/seedData';
import { FREE_DELIVERY_THRESHOLD, useBag } from '../hooks/useBag';
import { useReducedMotion } from '../hooks/useReducedMotion';

export function BagDrawer() {
  const navigate = useNavigate();
  const {
    items,
    isBagOpen,
    closeBag,
    addToBag,
    updateQuantity,
    removeItem,
    toggleWishlist,
    isWishlisted,
    subtotal,
    discount,
    shippingFee,
    total,
    couponCode,
    applyCoupon,
    removeCoupon,
    freeDeliveryProgress,
    amountToFreeDelivery,
  } = useBag();
  const { shouldSimplify } = useReducedMotion();

  const [codeInput, setCodeInput] = useState('');
  const [couponFeedback, setCouponFeedback] = useState<{ ok: boolean; message: string } | null>(
    null
  );

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeInput.trim()) return;
    const res = await applyCoupon(codeInput.trim());
    setCouponFeedback(res);
    if (res.ok) setCodeInput('');
  };

  const handleQuickCoupon = async (code: string) => {
    const res = await applyCoupon(code);
    setCouponFeedback(res);
  };

  const handleProceedCheckout = () => {
    closeBag();
    navigate('/checkout');
  };

  const inBagIds = new Set(items.map((i) => i.productId));
  const addOns = SEED_PRODUCTS.filter((p) => !inBagIds.has(p.id) && p.price <= 1599).slice(0, 2);

  return (
    <AnimatePresence>
      {isBagOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Shopping Bag">
          <motion.div
            className="fixed inset-0 bg-[#1F2A1C]/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeBag}
          />

          <motion.aside
            className="relative z-10 w-full max-w-md bg-[#F7F5EF] text-[#1F2A1C] h-full flex flex-col border-l border-[#C5D1B8]"
            initial={shouldSimplify ? { opacity: 0 } : { x: '100%' }}
            animate={shouldSimplify ? { opacity: 1 } : { x: 0 }}
            exit={shouldSimplify ? { opacity: 0 } : { x: '100%' }}
            transition={
              shouldSimplify
                ? { duration: 0.15 }
                : { type: 'spring', stiffness: 360, damping: 36 }
            }
          >
            <div className="flex items-center justify-between px-6 py-4 bg-[#9CAF88] border-b border-[#7F956B]">
              <h2 className="font-display text-xl font-bold text-[#1F2A1C]">Your Bag</h2>
              <button
                type="button"
                onClick={closeBag}
                aria-label="Close bag"
                className="p-2 rounded-md text-[#1F2A1C] hover:bg-[#8EA379] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Free Delivery Progress Bar (scaleX transform only, zero layout reflow) */}
            <div className="px-6 py-3.5 bg-[#E7ECE0] border-b border-[#C5D1B8]">
              <p className="text-xs font-medium text-[#1F2A1C] mb-2 tabular-nums">
                {amountToFreeDelivery === 0
                  ? 'Unlocked: Free Express-Standard India Delivery'
                  : `Add ₹${amountToFreeDelivery.toLocaleString('en-IN')} more for free delivery (₹${FREE_DELIVERY_THRESHOLD.toLocaleString('en-IN')} threshold)`}
              </p>
              <div className="h-2 w-full bg-[#F7F5EF] rounded-full overflow-hidden border border-[#C5D1B8]">
                <motion.div
                  className="h-full bg-[#1F2A1C] origin-left"
                  initial={false}
                  animate={{ scaleX: freeDeliveryProgress / 100 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {items.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="font-display text-lg font-semibold mb-2">Your bag is empty</p>
                  <p className="text-sm text-[#4D5A48] mb-6">
                    Explore heavyweight tees, handloom kurtas, and relaxed bottoms crafted in India.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      closeBag();
                      navigate('/collections/all');
                    }}
                    className="px-6 py-3 bg-[#9CAF88] text-[#1F2A1C] font-semibold rounded-md hover:bg-[#8EA379] transition-colors"
                  >
                    Browse Collection
                  </button>
                </div>
              ) : (
                <>
                  {items.map((item) => (
                    <div
                      key={`${item.productId}-${item.color}-${item.size}`}
                      className="flex gap-4 pb-5 border-b border-[#CFD9C3]"
                    >
                      <Link to={`/product/${item.slug}`} onClick={closeBag} className="shrink-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          width={88}
                          height={110}
                          className="w-20 h-24 object-cover rounded-md bg-[#E7ECE0] border border-[#C5D1B8]"
                          referrerPolicy="no-referrer"
                        />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            to={`/product/${item.slug}`}
                            onClick={closeBag}
                            className="font-display text-sm font-semibold text-[#1F2A1C] truncate hover:underline"
                          >
                            {item.name}
                          </Link>
                          <button
                            type="button"
                            onClick={() => removeItem(item.productId, item.color, item.size)}
                            aria-label={`Remove ${item.name}`}
                            className="p-1.5 text-[#4D5A48] hover:text-[#1F2A1C] rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-[#4D5A48] mt-1">
                          {item.color} · Size {item.size}
                        </p>
                        <div className="flex items-center justify-between mt-3">
                          <div className="inline-flex items-center border border-[#C5D1B8] rounded-md bg-[#FCFBF7]">
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(item.productId, item.color, item.size, -1)
                              }
                              aria-label="Decrease quantity"
                              className="p-2 text-[#1F2A1C] hover:bg-[#E7ECE0]"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-3 text-sm font-medium tabular-nums">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(item.productId, item.color, item.size, 1)
                              }
                              aria-label="Increase quantity"
                              className="p-2 text-[#1F2A1C] hover:bg-[#E7ECE0]"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <span className="text-sm font-semibold tabular-nums">
                            ₹{(item.unitPrice * item.quantity).toLocaleString('en-IN')}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={async () => {
                            if (!isWishlisted(item.productId)) {
                              await toggleWishlist(item.productId);
                            }
                            removeItem(item.productId, item.color, item.size);
                          }}
                          className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-[#4D5A48] hover:text-[#1F2A1C] underline"
                        >
                          <Heart className="w-3 h-3" />
                          <span>Save for later</span>
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Complete Your Bag Add-Ons */}
                  {addOns.length > 0 && (
                    <div className="pt-1 space-y-2.5">
                      <p className="text-xs font-semibold text-[#4D5A48]">Pair with</p>
                      <div className="space-y-2">
                        {addOns.map((p) => {
                          const col = p.colors[0];
                          const variant =
                            p.variants.find((v) => v.color === col.name && v.stock > 0) ||
                            p.variants[0];
                          if (!variant) return null;
                          return (
                            <div
                              key={p.id}
                              className="flex items-center justify-between gap-3 p-2.5 rounded-md bg-[#FCFBF7] border border-[#C5D1B8]"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <img
                                  src={col.images[0]}
                                  alt={p.name}
                                  className="w-11 h-14 object-cover rounded border border-[#C5D1B8] shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold truncate">{p.name}</p>
                                  <p className="text-[11px] text-[#4D5A48] tabular-nums">
                                    {col.name} · {variant.size} · ₹{p.price.toLocaleString('en-IN')}
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) =>
                                  addToBag(
                                    {
                                      productId: p.id,
                                      slug: p.slug,
                                      name: p.name,
                                      category: p.category,
                                      color: col.name,
                                      size: variant.size,
                                      unitPrice: p.price + (col.priceDelta || 0),
                                      quantity: 1,
                                      image: col.images[0],
                                    },
                                    { sourceRect: e.currentTarget.getBoundingClientRect() }
                                  )
                                }
                                className="px-3 py-1.5 rounded bg-[#9CAF88] text-[#1F2A1C] text-xs font-bold hover:bg-[#8EA379] shrink-0"
                              >
                                + Add
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {items.length > 0 && (
              <div className="p-6 bg-[#FCFBF7] border-t border-[#C5D1B8] space-y-4">
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input
                    type="text"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                    placeholder="Coupon code (try FIRST10)"
                    aria-label="Coupon code"
                    className="flex-1 px-3 py-2 text-sm bg-[#F7F5EF] border border-[#C5D1B8] rounded-md text-[#1F2A1C] placeholder:text-[#4D5A48]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-semibold bg-[#9CAF88] text-[#1F2A1C] rounded-md hover:bg-[#8EA379] transition-colors whitespace-nowrap"
                  >
                    Apply
                  </button>
                </form>

                {!couponCode && (
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="text-[#4D5A48]">Offers:</span>
                    <button
                      type="button"
                      onClick={() => handleQuickCoupon('FIRST10')}
                      className="px-2 py-1 rounded bg-[#E7ECE0] border border-[#C5D1B8] font-semibold hover:bg-[#9CAF88]"
                    >
                      FIRST10 (10% off)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickCoupon('WICKED15')}
                      className="px-2 py-1 rounded bg-[#E7ECE0] border border-[#C5D1B8] font-semibold hover:bg-[#9CAF88]"
                    >
                      WICKED15 (15% off ₹3.5k+)
                    </button>
                  </div>
                )}

                {couponCode && (
                  <div className="flex items-center justify-between text-xs text-[#1F2A1C] bg-[#E7ECE0] px-3 py-2 rounded-md">
                    <span>Applied: {couponCode}</span>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="underline font-medium"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {couponFeedback && !couponCode && (
                  <p className="text-xs text-[#4D5A48]">{couponFeedback.message}</p>
                )}

                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-[#4D5A48]">
                    <span>Subtotal</span>
                    <span className="tabular-nums">₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-[#1F2A1C] font-medium">
                      <span>Discount</span>
                      <span className="tabular-nums">-₹{discount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#4D5A48]">
                    <span>Delivery</span>
                    <span className="tabular-nums">
                      {shippingFee === 0 ? 'Free' : `₹${shippingFee}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-bold pt-2 border-t border-[#CFD9C3]">
                    <span>Total (incl. GST)</span>
                    <span className="tabular-nums">₹{total.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleProceedCheckout}
                  className="w-full py-3.5 px-6 rounded-md btn-tomato text-center"
                >
                  Place order · ₹{total.toLocaleString('en-IN')}
                </button>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
