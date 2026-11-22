export type CategorySlug = 'tees' | 'shirts' | 'kurtas' | 'hoodies' | 'bottoms' | 'accessories';

export type GenderTarget = 'men' | 'women' | 'unisex';

export type OrderStatus =
  | 'placed'
  | 'paid'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export interface ProductColor {
  name: string;
  hex: string;
  images: string[];
  priceDelta?: number;
}

export interface ProductVariant {
  sku: string;
  color: string;
  size: string;
  stock: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: CategorySlug;
  gender: GenderTarget;
  fit: string;
  price: number;
  compareAtPrice?: number;
  gsm: number;
  fabric: string;
  care: string;
  description: string;
  isNew?: boolean;
  onSale?: boolean;
  featured?: boolean;
  colors: ProductColor[];
  variants: ProductVariant[];
  rating: number;
  reviewCount: number;
  updatedAt?: string;
}

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  category: CategorySlug;
  color: string;
  size: string;
  unitPrice: number;
  quantity: number;
  image: string;
}

export interface ShippingAddress {
  fullName: string;
  email: string;
  phone: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
}

export interface Order {
  id: string;
  userId: string;
  customerEmail: string;
  customerPhone: string;
  status: OrderStatus;
  paymentMethod: 'razorpay' | 'cod';
  deliveryMethod: 'standard' | 'express';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  refundId?: string;
  refundAmount?: number;
  subtotal: number;
  discount: number;
  shippingFee: number;
  gstAmount: number;
  total: number;
  couponCode?: string;
  items: CartItem[];
  shippingAddress: ShippingAddress;
  trackingNumber?: string;
  giftNote?: string;
  gstin?: string;
  exchangeRequested?: boolean;
  exchangeReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  authorName: string;
  rating: number;
  title: string;
  body: string;
  verifiedBuyer: boolean;
  createdAt: string;
}

export interface Coupon {
  code: string;
  percentOff: number;
  minSubtotal: number;
  active: boolean;
}

export interface LookbookHotspot {
  id: string;
  xPercent: number;
  yPercent: number;
  productId: string;
  label: string;
}

export interface ShowcaseData {
  spin360: {
    productId: string;
    title: string;
    subtitle: string;
    frameCount: number;
    angleSources: {
      front: string;
      right: string;
      back: string;
    };
    customFrames?: string[];
  };
  lookbook: {
    title: string;
    subtitle: string;
    imageUrl: string;
    hotspots: LookbookHotspot[];
  };
  fabricExplorer: {
    title: string;
    subtitle: string;
    imageUrl: string;
    notes: {
      id: string;
      title: string;
      gsm: string;
      weave: string;
      care: string;
    }[];
  };
  storySteps: {
    step: string;
    title: string;
    location: string;
    detail: string;
  }[];
}

export interface BannerConfig {
  id: string;
  headline: string;
  subheadline: string;
  ctaLabel: string;
  ctaPath: string;
  marqueeText: string;
  heroImage: string;
  active: boolean;
}
