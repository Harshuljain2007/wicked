import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import type { CartItem } from '../types';
import { useAuth } from './useAuth';

export const FREE_DELIVERY_THRESHOLD = 1499;
export const STANDARD_SHIPPING_FEE = 79;

interface FlyAnimationState {
  image: string;
  fromX: number;
  fromY: number;
}

interface BagContextValue {
  items: CartItem[];
  wishlistIds: string[];
  couponCode: string;
  couponDiscountPercent: number;
  isOutfitBundle: boolean;
  isBagOpen: boolean;
  flyingItem: FlyAnimationState | null;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  itemCount: number;
  freeDeliveryProgress: number;
  amountToFreeDelivery: number;
  openBag: () => void;
  closeBag: () => void;
  addToBag: (
    item: CartItem,
    options?: { openDrawer?: boolean; sourceRect?: DOMRect | null; isBundle?: boolean }
  ) => void;
  addBundleToBag: (bundleItems: CartItem[]) => void;
  updateQuantity: (productId: string, color: string, size: string, delta: number) => void;
  removeItem: (productId: string, color: string, size: string) => void;
  clearBag: () => void;
  applyCoupon: (code: string) => Promise<{ ok: boolean; message: string }>;
  removeCoupon: () => void;
  toggleWishlist: (productId: string) => Promise<void>;
  isWishlisted: (productId: string) => boolean;
}

const BagContext = createContext<BagContextValue | null>(null);

export function BagProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscountPercent, setCouponDiscountPercent] = useState(0);
  const [isOutfitBundle, setIsOutfitBundle] = useState(false);
  const [isBagOpen, setIsBagOpen] = useState(false);
  const [flyingItem, setFlyingItem] = useState<FlyAnimationState | null>(null);

  useEffect(() => {
    const fbUid = auth.currentUser?.uid;
    if (!user || user.provider !== 'firebase' || !fbUid) {
      return;
    }
    const wCol = collection(db, 'users', fbUid, 'wishlist');
    const unsub = onSnapshot(
      wCol,
      (snap) => {
        setWishlistIds(snap.docs.map((d) => d.id));
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, `users/${fbUid}/wishlist`);
      }
    );
    return () => unsub();
  }, [user]);

  const openBag = useCallback(() => setIsBagOpen(true), []);
  const closeBag = useCallback(() => setIsBagOpen(false), []);

  const triggerFlyAnimation = useCallback((image: string, rect?: DOMRect | null) => {
    if (!rect) return;
    setFlyingItem({
      image,
      fromX: rect.left + rect.width / 2,
      fromY: rect.top + rect.height / 2,
    });
    window.setTimeout(() => setFlyingItem(null), 650);
  }, []);

  const addToBag = useCallback(
    (
      newItem: CartItem,
      options?: { openDrawer?: boolean; sourceRect?: DOMRect | null; isBundle?: boolean }
    ) => {
      setItems((prev) => {
        const idx = prev.findIndex(
          (i) =>
            i.productId === newItem.productId &&
            i.color === newItem.color &&
            i.size === newItem.size
        );
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            quantity: Math.min(10, next[idx].quantity + newItem.quantity),
          };
          return next;
        }
        return [...prev, newItem];
      });
      if (options?.isBundle) setIsOutfitBundle(true);
      triggerFlyAnimation(newItem.image, options?.sourceRect);
      if (options?.openDrawer !== false) {
        setIsBagOpen(true);
      }
    },
    [triggerFlyAnimation]
  );

  const addBundleToBag = useCallback((bundleItems: CartItem[]) => {
    setItems((prev) => {
      const next = [...prev];
      for (const b of bundleItems) {
        const idx = next.findIndex(
          (i) => i.productId === b.productId && i.color === b.color && i.size === b.size
        );
        if (idx >= 0) {
          next[idx] = { ...next[idx], quantity: Math.min(10, next[idx].quantity + b.quantity) };
        } else {
          next.push(b);
        }
      }
      return next;
    });
    setIsOutfitBundle(true);
    setIsBagOpen(true);
  }, []);

  const updateQuantity = useCallback(
    (productId: string, color: string, size: string, delta: number) => {
      setItems((prev) =>
        prev
          .map((item) => {
            if (item.productId === productId && item.color === color && item.size === size) {
              const nextQty = item.quantity + delta;
              return nextQty > 0 ? { ...item, quantity: Math.min(10, nextQty) } : null;
            }
            return item;
          })
          .filter((item): item is CartItem => item !== null)
      );
    },
    []
  );

  const removeItem = useCallback((productId: string, color: string, size: string) => {
    setItems((prev) =>
      prev.filter(
        (i) => !(i.productId === productId && i.color === color && i.size === size)
      )
    );
  }, []);

  const clearBag = useCallback(() => {
    setItems([]);
    setCouponCode('');
    setCouponDiscountPercent(0);
    setIsOutfitBundle(false);
  }, []);

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  const applyCoupon = useCallback(
    async (code: string) => {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal }),
      });
      const data = await res.json();
      if (!data.valid || !data.coupon) {
        return { ok: false, message: data.reason || 'Invalid coupon code.' };
      }
      setCouponCode(data.coupon.code);
      setCouponDiscountPercent(data.coupon.percentOff);
      return { ok: true, message: `${data.coupon.code} applied (${data.coupon.percentOff}% off)` };
    },
    [subtotal]
  );

  const removeCoupon = useCallback(() => {
    setCouponCode('');
    setCouponDiscountPercent(0);
  }, []);

  const toggleWishlist = useCallback(
    async (productId: string) => {
      const exists = wishlistIds.includes(productId);
      const fbUid = auth.currentUser?.uid;
      if (user?.provider === 'firebase' && fbUid) {
        const ref = doc(db, 'users', fbUid, 'wishlist', productId);
        try {
          if (exists) {
            await deleteDoc(ref);
          } else {
            await setDoc(ref, {
              productId,
              userId: fbUid,
              createdAt: serverTimestamp(),
            });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${fbUid}/wishlist/${productId}`);
        }
      } else {
        setWishlistIds((prev) =>
          exists ? prev.filter((id) => id !== productId) : [...prev, productId]
        );
      }
    },
    [user, wishlistIds]
  );

  const isWishlisted = useCallback(
    (productId: string) => wishlistIds.includes(productId),
    [wishlistIds]
  );

  const bundleDiscount = isOutfitBundle && items.length >= 3 ? Math.round(subtotal * 0.12) : 0;
  const couponDiscount = Math.round((subtotal * couponDiscountPercent) / 100);
  const discount = Math.max(bundleDiscount, couponDiscount);
  const netSubtotal = Math.max(0, subtotal - discount);
  const shippingFee = netSubtotal === 0 || netSubtotal >= FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
  const total = netSubtotal + shippingFee;
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const freeDeliveryProgress = Math.min(100, Math.round((netSubtotal / FREE_DELIVERY_THRESHOLD) * 100));
  const amountToFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - netSubtotal);

  return (
    <BagContext.Provider
      value={{
        items,
        wishlistIds,
        couponCode,
        couponDiscountPercent,
        isOutfitBundle,
        isBagOpen,
        flyingItem,
        subtotal,
        discount,
        shippingFee,
        total,
        itemCount,
        freeDeliveryProgress,
        amountToFreeDelivery,
        openBag,
        closeBag,
        addToBag,
        addBundleToBag,
        updateQuantity,
        removeItem,
        clearBag,
        applyCoupon,
        removeCoupon,
        toggleWishlist,
        isWishlisted,
      }}
    >
      {children}
    </BagContext.Provider>
  );
}

export function useBag(): BagContextValue {
  const ctx = useContext(BagContext);
  if (!ctx) throw new Error('useBag must be used inside BagProvider');
  return ctx;
}
