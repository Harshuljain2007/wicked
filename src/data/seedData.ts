import type { BannerConfig, Coupon, Product, Review, ShowcaseData } from '../types';

const ASSET_BASE =
  (typeof import.meta !== 'undefined' &&
    (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL) ||
  '/';

export const IMG_HERO = `${ASSET_BASE}src/assets/images/wicked_hero_campaign_1795345381120.jpg`;
export const IMG_LOOKBOOK = `${ASSET_BASE}src/assets/images/wicked_lookbook_courtyard_1795345381018.jpg`;
export const IMG_FABRIC = `${ASSET_BASE}src/assets/images/wicked_fabric_macro_1795345381468.jpg`;
export const IMG_TEE_SAGE = `${ASSET_BASE}src/assets/images/wicked_tee_sage_1795345380963.jpg`;
export const IMG_TEE_CHARCOAL = `${ASSET_BASE}src/assets/images/wicked_tee_charcoal_1795345380471.jpg`;
export const IMG_KURTA_SAGE = `${ASSET_BASE}src/assets/images/wicked_kurta_sage_1795345380633.jpg`;
export const IMG_SHIRT_OFFWHITE = `${ASSET_BASE}src/assets/images/wicked_shirt_offwhite_1795345381450.jpg`;
export const IMG_HOODIE_FRONT = `${ASSET_BASE}src/assets/images/wicked_hoodie_front_1795345380349.jpg`;
export const IMG_HOODIE_SIDE = `${ASSET_BASE}src/assets/images/wicked_hoodie_side_1795345381483.jpg`;
export const IMG_HOODIE_BACK = `${ASSET_BASE}src/assets/images/wicked_hoodie_back_1795345381587.jpg`;
export const IMG_BOTTOMS_SAND = `${ASSET_BASE}src/assets/images/wicked_bottoms_sand_1795345381876.jpg`;
export const IMG_ACCESSORY_SLING = `${ASSET_BASE}src/assets/images/wicked_accessory_sling_1795345380698.jpg`;

const APPAREL_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

function makeVariants(skuPrefix: string, colors: string[], lowStockSize?: string) {
  const variants = [];
  for (const color of colors) {
    for (const size of APPAREL_SIZES) {
      const code = `${skuPrefix}-${color.slice(0, 3).toUpperCase()}-${size}`;
      const stock = size === lowStockSize ? 2 : size === 'XXL' ? 4 : 14;
      variants.push({ sku: code, color, size, stock });
    }
  }
  return variants;
}

export const SEED_PRODUCTS: Product[] = [
  {
    id: 'wk-tee-01',
    slug: 'jaipur-heavyweight-boxy-tee',
    name: 'Jaipur Heavyweight Boxy Tee',
    category: 'tees',
    gender: 'unisex',
    fit: 'Boxy Drop-Shoulder',
    price: 1299,
    compareAtPrice: 1599,
    gsm: 280,
    fabric: '100% Combed Ring-Spun Organic Cotton',
    care: 'Cold machine wash inside out. Dry flat in shade.',
    description:
      'Cut in a structured boxy silhouette with a thick 2.5cm ribbed collar that never loses tension. Enzyme-washed in Jaipur for a dry, architectural handfeel.',
    isNew: true,
    onSale: true,
    featured: true,
    colors: [
      { name: 'Sage', hex: '#9CAF88', images: [IMG_TEE_SAGE, IMG_TEE_CHARCOAL] },
      { name: 'Charcoal', hex: '#1F2A1C', images: [IMG_TEE_CHARCOAL, IMG_TEE_SAGE], priceDelta: 0 },
      { name: 'Raw Ecru', hex: '#EDE8DC', images: [IMG_SHIRT_OFFWHITE, IMG_TEE_SAGE], priceDelta: 100 },
    ],
    variants: makeVariants('WKT01', ['Sage', 'Charcoal', 'Raw Ecru'], 'XXL'),
    rating: 4.8,
    reviewCount: 42,
  },
  {
    id: 'wk-tee-02',
    slug: 'slub-everyday-crew-tee',
    name: 'Slub Everyday Crew Tee',
    category: 'tees',
    gender: 'men',
    fit: 'Relaxed Fit',
    price: 999,
    gsm: 220,
    fabric: 'Tiruppur Cotton Slub Jersey',
    care: 'Gentle wash cold. Warm iron.',
    description:
      'Breathable everyday slub jersey built for humid Indian summers, finished with split side hems and tonal twin-needle stitching.',
    isNew: false,
    onSale: false,
    featured: false,
    colors: [
      { name: 'Charcoal', hex: '#1F2A1C', images: [IMG_TEE_CHARCOAL, IMG_TEE_SAGE] },
      { name: 'Sage', hex: '#9CAF88', images: [IMG_TEE_SAGE, IMG_TEE_CHARCOAL] },
    ],
    variants: makeVariants('WKT02', ['Charcoal', 'Sage']),
    rating: 4.6,
    reviewCount: 28,
  },
  {
    id: 'wk-tee-03',
    slug: 'cropped-rib-studio-tee',
    name: 'Cropped Rib Studio Tee',
    category: 'tees',
    gender: 'women',
    fit: 'Cropped Boxy',
    price: 1099,
    gsm: 260,
    fabric: 'Organic Interlock Cotton',
    care: 'Cold gentle wash.',
    description:
      'Clean waist-grazing boxy tee in dense interlock knit with high-set crew neckline and wide sleeves.',
    isNew: true,
    onSale: false,
    featured: false,
    colors: [
      { name: 'Sage', hex: '#9CAF88', images: [IMG_TEE_SAGE, IMG_TEE_CHARCOAL] },
      { name: 'Charcoal', hex: '#1F2A1C', images: [IMG_TEE_CHARCOAL, IMG_TEE_SAGE] },
    ],
    variants: makeVariants('WKT03', ['Sage', 'Charcoal'], 'S'),
    rating: 4.9,
    reviewCount: 19,
  },
  {
    id: 'wk-tee-04',
    slug: 'arch-seam-longline-tee',
    name: 'Arch Seam Longline Tee',
    category: 'tees',
    gender: 'unisex',
    fit: 'Oversized',
    price: 1399,
    compareAtPrice: 1699,
    gsm: 290,
    fabric: 'Compact Combed Cotton Jersey',
    care: 'Machine wash cold.',
    description:
      'Reverse-seam shoulder construction with subtle side-slit drape inspired by traditional kurta hems.',
    isNew: false,
    onSale: true,
    featured: false,
    colors: [
      { name: 'Charcoal', hex: '#1F2A1C', images: [IMG_TEE_CHARCOAL, IMG_TEE_SAGE] },
      { name: 'Sage', hex: '#9CAF88', images: [IMG_TEE_SAGE, IMG_TEE_CHARCOAL] },
    ],
    variants: makeVariants('WKT04', ['Charcoal', 'Sage']),
    rating: 4.7,
    reviewCount: 15,
  },
  {
    id: 'wk-kurta-01',
    slug: 'mandarin-handloom-kurta-overshirt',
    name: 'Mandarin Handloom Kurta Overshirt',
    category: 'kurtas',
    gender: 'unisex',
    fit: 'Relaxed Architectural',
    price: 2499,
    compareAtPrice: 2999,
    gsm: 210,
    fabric: 'Hand-spun Kora & Sage Cotton Slub',
    care: 'Hand wash or gentle cold cycle. Steam finish.',
    description:
      'Our signature ethnic-fusion silhouette. Combines a crisp mandarin band collar and straight kurta hem with a utility flap pocket and matte corozo buttons.',
    isNew: true,
    onSale: true,
    featured: true,
    colors: [
      { name: 'Sage', hex: '#9CAF88', images: [IMG_KURTA_SAGE, IMG_LOOKBOOK] },
      { name: 'Raw Ecru', hex: '#EDE8DC', images: [IMG_SHIRT_OFFWHITE, IMG_KURTA_SAGE], priceDelta: 0 },
    ],
    variants: makeVariants('WKK01', ['Sage', 'Raw Ecru'], 'XL'),
    rating: 4.9,
    reviewCount: 64,
  },
  {
    id: 'wk-kurta-02',
    slug: 'deccan-pleated-short-kurta',
    name: 'Deccan Pleated Short Kurta',
    category: 'kurtas',
    gender: 'men',
    fit: 'Boxy Straight',
    price: 2199,
    gsm: 195,
    fabric: '100% Breathable Mul-Twill Cotton',
    care: 'Cold wash separately.',
    description:
      'Minimal concealed-placket short kurta tailored with back box pleats for effortless movement from studio days to festive evenings.',
    isNew: true,
    onSale: false,
    featured: false,
    colors: [
      { name: 'Sage', hex: '#9CAF88', images: [IMG_KURTA_SAGE, IMG_SHIRT_OFFWHITE] },
    ],
    variants: makeVariants('WKK02', ['Sage']),
    rating: 4.7,
    reviewCount: 23,
  },
  {
    id: 'wk-kurta-03',
    slug: 'udaipur-drape-tunic-kurta',
    name: 'Udaipur Drape Tunic Kurta',
    category: 'kurtas',
    gender: 'women',
    fit: 'Fluid Relaxed',
    price: 2399,
    gsm: 185,
    fabric: 'Organic Khadi-Blend Cotton',
    care: 'Gentle wash cold.',
    description:
      'Side-vented tunic kurta with dropped shoulders, deep side-seam pockets, and subtle tonal stitch detailing.',
    isNew: false,
    onSale: false,
    featured: true,
    colors: [
      { name: 'Sage', hex: '#9CAF88', images: [IMG_KURTA_SAGE, IMG_HERO] },
      { name: 'Raw Ecru', hex: '#EDE8DC', images: [IMG_SHIRT_OFFWHITE, IMG_KURTA_SAGE] },
    ],
    variants: makeVariants('WKK03', ['Sage', 'Raw Ecru']),
    rating: 4.8,
    reviewCount: 31,
  },
  {
    id: 'wk-kurta-04',
    slug: 'bandhgala-utility-kurta',
    name: 'Bandhgala Utility Kurta',
    category: 'kurtas',
    gender: 'men',
    fit: 'Structured Regular',
    price: 2799,
    compareAtPrice: 3299,
    gsm: 230,
    fabric: 'Heavyweight Canvas-Weave Cotton',
    care: 'Dry clean or cold gentle wash.',
    description:
      'High-stand bandhgala collar meets dual concealed hip pockets and matte hardware closures.',
    isNew: false,
    onSale: true,
    featured: false,
    colors: [
      { name: 'Sage', hex: '#9CAF88', images: [IMG_KURTA_SAGE, IMG_LOOKBOOK] },
    ],
    variants: makeVariants('WKK04', ['Sage'], 'S'),
    rating: 4.6,
    reviewCount: 14,
  },
  {
    id: 'wk-shirt-01',
    slug: 'ecru-camp-collar-poplin-shirt',
    name: 'Ecru Camp-Collar Poplin Shirt',
    category: 'shirts',
    gender: 'unisex',
    fit: 'Boxy Camp',
    price: 1899,
    gsm: 175,
    fabric: 'GOTS-Certified Crisp Poplin',
    care: 'Machine wash cold, line dry.',
    description:
      'Open notch camp collar cut with a clean straight hem and chest patch pocket. Designed to wear solo or layered over our 280 GSM tee.',
    isNew: true,
    onSale: false,
    featured: true,
    colors: [
      { name: 'Raw Ecru', hex: '#EDE8DC', images: [IMG_SHIRT_OFFWHITE, IMG_KURTA_SAGE] },
      { name: 'Sage', hex: '#9CAF88', images: [IMG_KURTA_SAGE, IMG_SHIRT_OFFWHITE] },
    ],
    variants: makeVariants('WKS01', ['Raw Ecru', 'Sage']),
    rating: 4.8,
    reviewCount: 37,
  },
  {
    id: 'wk-shirt-02',
    slug: 'studio-oxford-overshirt',
    name: 'Studio Oxford Overshirt',
    category: 'shirts',
    gender: 'men',
    fit: 'Oversized Layer',
    price: 2299,
    compareAtPrice: 2699,
    gsm: 245,
    fabric: 'Brushed Heavy Oxford Cotton',
    care: 'Cold wash, low tumble.',
    description:
      'Heavy-gauge Oxford cloth that bridges shirt and light jacket with reinforced elbow darts.',
    isNew: false,
    onSale: true,
    featured: false,
    colors: [
      { name: 'Raw Ecru', hex: '#EDE8DC', images: [IMG_SHIRT_OFFWHITE, IMG_TEE_SAGE] },
    ],
    variants: makeVariants('WKS02', ['Raw Ecru']),
    rating: 4.7,
    reviewCount: 21,
  },
  {
    id: 'wk-shirt-03',
    slug: 'atelier-linen-resort-shirt',
    name: 'Atelier Linen Resort Shirt',
    category: 'shirts',
    gender: 'women',
    fit: 'Relaxed Cropped',
    price: 1999,
    gsm: 165,
    fabric: '55% Linen / 45% Organic Cotton',
    care: 'Gentle cold wash.',
    description:
      'Breezy linen-cotton weave with mother-of-pearl finish buttons and dropped short sleeves.',
    isNew: true,
    onSale: false,
    featured: false,
    colors: [
      { name: 'Raw Ecru', hex: '#EDE8DC', images: [IMG_SHIRT_OFFWHITE, IMG_HERO] },
      { name: 'Sage', hex: '#9CAF88', images: [IMG_KURTA_SAGE, IMG_SHIRT_OFFWHITE] },
    ],
    variants: makeVariants('WKS03', ['Raw Ecru', 'Sage']),
    rating: 4.9,
    reviewCount: 18,
  },
  {
    id: 'wk-hoodie-01',
    slug: 'monolith-420gsm-sage-hoodie',
    name: 'Monolith 420 GSM Sage Hoodie',
    category: 'hoodies',
    gender: 'unisex',
    fit: 'Oversized Boxy',
    price: 3499,
    compareAtPrice: 3999,
    gsm: 420,
    fabric: '420 GSM Diagonal Loopback French Terry',
    care: 'Cold wash inside out. Do not wring.',
    description:
      'Engineered with a structured double-lined hood, no-sag cuffs, and custom vat-dyed sage fleece. Featured in our 360-degree studio viewer.',
    isNew: true,
    onSale: true,
    featured: true,
    colors: [
      { name: 'Sage', hex: '#9CAF88', images: [IMG_HOODIE_FRONT, IMG_HOODIE_SIDE, IMG_HOODIE_BACK] },
      { name: 'Charcoal', hex: '#1F2A1C', images: [IMG_TEE_CHARCOAL, IMG_HOODIE_FRONT], priceDelta: 0 },
    ],
    variants: makeVariants('WKH01', ['Sage', 'Charcoal'], 'M'),
    rating: 4.9,
    reviewCount: 89,
  },
  {
    id: 'wk-hoodie-02',
    slug: 'kora-heavy-zip-hoodie',
    name: 'Kora Heavy Zip Hoodie',
    category: 'hoodies',
    gender: 'unisex',
    fit: 'Relaxed Drop-Shoulder',
    price: 3799,
    gsm: 400,
    fabric: 'Brushed Organic Fleece Cotton',
    care: 'Machine wash cold.',
    description:
      'Two-way antique brass zip closure with deep welt pockets and structured hood.',
    isNew: false,
    onSale: false,
    featured: false,
    colors: [
      { name: 'Sage', hex: '#9CAF88', images: [IMG_HOODIE_FRONT, IMG_HOODIE_BACK] },
    ],
    variants: makeVariants('WKH02', ['Sage']),
    rating: 4.7,
    reviewCount: 25,
  },
  {
    id: 'wk-hoodie-03',
    slug: 'terrace-raw-hem-pullover',
    name: 'Terrace Raw-Hem Pullover',
    category: 'hoodies',
    gender: 'women',
    fit: 'Boxy Cropped',
    price: 3199,
    gsm: 380,
    fabric: 'Combed French Terry',
    care: 'Cold gentle wash.',
    description:
      'Clean-lined cropped hoodie with tonal braided drawcords and reinforced kangaroo pocket.',
    isNew: true,
    onSale: false,
    featured: false,
    colors: [
      { name: 'Sage', hex: '#9CAF88', images: [IMG_HOODIE_FRONT, IMG_HOODIE_SIDE] },
    ],
    variants: makeVariants('WKH03', ['Sage']),
    rating: 4.8,
    reviewCount: 16,
  },
  {
    id: 'wk-bottoms-01',
    slug: 'sandstone-pleated-wide-trousers',
    name: 'Sandstone Pleated Wide Trousers',
    category: 'bottoms',
    gender: 'unisex',
    fit: 'Wide-Leg Pleated',
    price: 2599,
    compareAtPrice: 2999,
    gsm: 295,
    fabric: 'Heavy Brushed Cotton Twill',
    care: 'Cold machine wash. Line dry.',
    description:
      'Double front pleats, hidden drawstring interior waist, and side utility pocket in warm sandstone twill.',
    isNew: true,
    onSale: true,
    featured: true,
    colors: [
      { name: 'Sandstone', hex: '#C8B99B', images: [IMG_BOTTOMS_SAND, IMG_LOOKBOOK] },
      { name: 'Sage', hex: '#9CAF88', images: [IMG_HERO, IMG_BOTTOMS_SAND] },
    ],
    variants: makeVariants('WKB01', ['Sandstone', 'Sage'], 'L'),
    rating: 4.9,
    reviewCount: 51,
  },
  {
    id: 'wk-bottoms-02',
    slug: 'courtyard-twill-cargo-pants',
    name: 'Courtyard Twill Cargo Pants',
    category: 'bottoms',
    gender: 'men',
    fit: 'Relaxed Straight',
    price: 2899,
    gsm: 310,
    fabric: 'Ripstop Cotton Twill',
    care: 'Machine wash cold.',
    description:
      'Architectural bellow cargo pockets without bulk, paired with adjustable hem toggles.',
    isNew: false,
    onSale: false,
    featured: false,
    colors: [
      { name: 'Sandstone', hex: '#C8B99B', images: [IMG_BOTTOMS_SAND, IMG_LOOKBOOK] },
    ],
    variants: makeVariants('WKB02', ['Sandstone']),
    rating: 4.7,
    reviewCount: 33,
  },
  {
    id: 'wk-bottoms-03',
    slug: 'jaipur-drawstring-culottes',
    name: 'Jaipur Drawstring Culottes',
    category: 'bottoms',
    gender: 'women',
    fit: 'Wide Cropped',
    price: 2299,
    gsm: 240,
    fabric: 'Handloom Cotton-Linen Blend',
    care: 'Cold wash gentle.',
    description:
      'Airy wide-cut trousers engineered for Indian heat with deep side pockets and elasticated back waist.',
    isNew: true,
    onSale: false,
    featured: false,
    colors: [
      { name: 'Sandstone', hex: '#C8B99B', images: [IMG_BOTTOMS_SAND, IMG_HERO] },
    ],
    variants: makeVariants('WKB03', ['Sandstone']),
    rating: 4.8,
    reviewCount: 27,
  },
  {
    id: 'wk-acc-01',
    slug: 'waxed-canvas-crossbody-sling',
    name: 'Waxed Canvas Crossbody Sling',
    category: 'accessories',
    gender: 'unisex',
    fit: 'One Size',
    price: 1699,
    compareAtPrice: 1999,
    gsm: 450,
    fabric: 'Water-Resistant Waxed Cotton Canvas',
    care: 'Spot clean with damp cloth.',
    description:
      'Compact everyday utility sling with matte black anodized D-rings, YKK AquaGuard zipper, and dedicated passport sleeve.',
    isNew: true,
    onSale: true,
    featured: true,
    colors: [
      { name: 'Olive Sage', hex: '#7F8F6B', images: [IMG_ACCESSORY_SLING, IMG_LOOKBOOK] },
    ],
    variants: [{ sku: 'WKA01-OLI-OS', color: 'Olive Sage', size: 'One Size', stock: 18 }],
    rating: 4.9,
    reviewCount: 44,
  },
  {
    id: 'wk-acc-02',
    slug: 'unstructured-6-panel-field-cap',
    name: 'Unstructured 6-Panel Field Cap',
    category: 'accessories',
    gender: 'unisex',
    fit: 'Adjustable One Size',
    price: 899,
    gsm: 340,
    fabric: 'Washed Waxed Cotton Twill',
    care: 'Hand wash cold.',
    description:
      'Low-profile 6-panel silhouette with matte metal clasp strap and breathable stitched eyelets.',
    isNew: false,
    onSale: false,
    featured: false,
    colors: [
      { name: 'Olive Sage', hex: '#7F8F6B', images: [IMG_ACCESSORY_SLING] },
    ],
    variants: [{ sku: 'WKA02-OLI-OS', color: 'Olive Sage', size: 'One Size', stock: 24 }],
    rating: 4.7,
    reviewCount: 22,
  },
  {
    id: 'wk-acc-03',
    slug: 'heavy-canvas-market-tote',
    name: 'Heavy Canvas Studio Tote',
    category: 'accessories',
    gender: 'unisex',
    fit: 'One Size (18L)',
    price: 1199,
    gsm: 480,
    fabric: 'Unbleached 16oz Cotton Duck Canvas',
    care: 'Spot clean only.',
    description:
      'Structured 18-litre daily carryall with reinforced webbing straps and interior 16-inch laptop divider.',
    isNew: false,
    onSale: false,
    featured: false,
    colors: [
      { name: 'Olive Sage', hex: '#7F8F6B', images: [IMG_ACCESSORY_SLING, IMG_HERO] },
    ],
    variants: [{ sku: 'WKA03-OLI-OS', color: 'Olive Sage', size: 'One Size', stock: 3 }],
    rating: 4.8,
    reviewCount: 19,
  },
];

export const SEED_COUPONS: Coupon[] = [
  { code: 'FIRST10', percentOff: 10, minSubtotal: 0, active: true },
  { code: 'WICKED15', percentOff: 15, minSubtotal: 2999, active: true },
];

export const SEED_BANNER: BannerConfig = {
  id: 'main',
  headline: 'Rooted in Craft. Cut for Now.',
  subheadline:
    'Heavyweight 280–420 GSM organic cottons, handloom fusion kurtas, and architectural everyday silhouettes designed in India.',
  ctaLabel: 'Explore Collection',
  ctaPath: '/collections/all',
  marqueeText: 'Free delivery over ₹1,499 • 7-day exchange • Cash on delivery',
  heroImage: IMG_HERO,
  active: true,
};

export const SEED_SHOWCASE: ShowcaseData = {
  spin360: {
    productId: 'wk-hoodie-01',
    title: '360° Studio Orbit',
    subtitle:
      'Drag or swipe across 24 preloaded WebP frames to inspect shoulder drop, hood structure, and 420 GSM drape. Scroll or pinch to zoom into the fleece.',
    frameCount: 24,
    angleSources: {
      front: IMG_HOODIE_FRONT,
      right: IMG_HOODIE_SIDE,
      back: IMG_HOODIE_BACK,
    },
  },
  lookbook: {
    title: 'Courtyard Lookbook 01',
    subtitle:
      'Tap any marker on the frame to inspect exact fabric weight, pick your colour and size, and add straight to your bag.',
    imageUrl: IMG_LOOKBOOK,
    hotspots: [
      {
        id: 'hs-kurta',
        xPercent: 50,
        yPercent: 32,
        productId: 'wk-kurta-01',
        label: 'Mandarin Handloom Kurta',
      },
      {
        id: 'hs-sling',
        xPercent: 46,
        yPercent: 45,
        productId: 'wk-acc-01',
        label: 'Waxed Canvas Sling',
      },
      {
        id: 'hs-bottoms',
        xPercent: 51,
        yPercent: 68,
        productId: 'wk-bottoms-01',
        label: 'Sandstone Pleated Trousers',
      },
    ],
  },
  fabricExplorer: {
    title: 'Tactile Mill Index',
    subtitle:
      'Hover on desktop or press-and-hold on mobile to inspect our custom Tiruppur French terry and Jaipur slub weaves under 2.4× optical magnification.',
    imageUrl: IMG_FABRIC,
    notes: [
      {
        id: 'f1',
        title: '420 GSM Loopback Terry',
        gsm: '420 GSM',
        weave: '3-end diagonal combed cotton loopback, zero polyester fleece',
        care: 'Cold wash inside out, dry flat away from direct afternoon sun',
      },
      {
        id: 'f2',
        title: '210 GSM Handloom Slub',
        gsm: '210 GSM',
        weave: 'High-twist single-ply warp with natural slub weft ventilation',
        care: 'Gentle wash cold, steam press while slightly damp',
      },
      {
        id: 'f3',
        title: '280 GSM Compact Jersey',
        gsm: '280 GSM',
        weave: 'Double-mercerized bio-washed compact combed yarn',
        care: 'Machine wash cold, line dry, never bleach',
      },
    ],
  },
  storySteps: [
    {
      step: '01',
      title: 'Organic Yarn Spinning',
      location: 'Tiruppur, Tamil Nadu',
      detail:
        'Long-staple organic cotton is ring-spun and bio-polished for zero pilling and high breathability across Indian climates.',
    },
    {
      step: '02',
      title: 'Signature Sage Vat Dyeing',
      location: 'Erode Dye Works',
      detail:
        'Low-liquor reactive dyeing locks in our muted botanical sage and deep charcoal tones without harsh azo chemicals.',
    },
    {
      step: '03',
      title: 'Pattern Architecture',
      location: 'Bengaluru Design Studio',
      detail:
        'Each block fuses traditional Indian kurta proportions with boxy streetwear shoulder drops and reinforced seams.',
    },
    {
      step: '04',
      title: 'Enzyme Stone Wash & QC',
      location: 'Jaipur Finishing House',
      detail:
        'Garments undergo enzyme pre-shrinking so collars hold structure and shrinkage stays under 1.5% across washes.',
    },
  ],
};

export const SEED_REVIEWS: Review[] = [
  {
    id: 'rev-1',
    productId: 'wk-kurta-01',
    userId: 'seed-user-1',
    authorName: 'Aarav Mehta',
    rating: 5,
    title: 'Finally a kurta cut like an overshirt',
    body: 'Wore the Sage Mandarin Kurta to a studio gallery opening in Mumbai and again with relaxed trousers at work. The corozo buttons and fabric drape feel substantial.',
    verifiedBuyer: true,
    createdAt: '2026-10-12T10:15:00Z',
  },
  {
    id: 'rev-2',
    productId: 'wk-tee-01',
    userId: 'seed-user-2',
    authorName: 'Rhea Kapoor',
    rating: 5,
    title: 'Collar holds flat even after 6 washes',
    body: '280 GSM is the sweet spot — structured boxy sleeves without feeling stiff in Bengaluru humidity. Ordered M for an oversized drape.',
    verifiedBuyer: true,
    createdAt: '2026-10-20T14:30:00Z',
  },
  {
    id: 'rev-3',
    productId: 'wk-hoodie-01',
    userId: 'seed-user-3',
    authorName: 'Kabir Sengupta',
    rating: 5,
    title: 'Proper 420 GSM loopback weight',
    body: 'Zero lint inside because it is pure cotton French terry instead of poly-fleece. Hood stands up cleanly.',
    verifiedBuyer: true,
    createdAt: '2026-11-02T09:10:00Z',
  },
  {
    id: 'rev-4',
    productId: 'wk-bottoms-01',
    userId: 'seed-user-4',
    authorName: 'Nandini Rao',
    rating: 5,
    title: 'Pleats sit cleanly with sneakers or kolhapuris',
    body: 'The hidden interior drawstring makes sizing super forgiving and the sandstone twill resists creasing.',
    verifiedBuyer: true,
    createdAt: '2026-11-05T16:45:00Z',
  },
];

export const PINCODE_DIRECTORY: Record<string, { city: string; state: string; days: number }> = {
  '400001': { city: 'Mumbai', state: 'Maharashtra', days: 2 },
  '400050': { city: 'Mumbai', state: 'Maharashtra', days: 2 },
  '110001': { city: 'New Delhi', state: 'Delhi', days: 2 },
  '110016': { city: 'New Delhi', state: 'Delhi', days: 2 },
  '560001': { city: 'Bengaluru', state: 'Karnataka', days: 2 },
  '560038': { city: 'Bengaluru', state: 'Karnataka', days: 2 },
  '302001': { city: 'Jaipur', state: 'Rajasthan', days: 2 },
  '411001': { city: 'Pune', state: 'Maharashtra', days: 3 },
  '500001': { city: 'Hyderabad', state: 'Telangana', days: 3 },
  '600001': { city: 'Chennai', state: 'Tamil Nadu', days: 3 },
  '700001': { city: 'Kolkata', state: 'West Bengal', days: 3 },
  '380001': { city: 'Ahmedabad', state: 'Gujarat', days: 3 },
  '395001': { city: 'Surat', state: 'Gujarat', days: 3 },
  '160001': { city: 'Chandigarh', state: 'Chandigarh', days: 3 },
  '682001': { city: 'Kochi', state: 'Kerala', days: 4 },
  '226001': { city: 'Lucknow', state: 'Uttar Pradesh', days: 4 },
  '462001': { city: 'Bhopal', state: 'Madhya Pradesh', days: 4 },
};

export function lookupIndianPincode(pincode: string): {
  serviceable: boolean;
  city: string;
  state: string;
  estimatedDays: number;
  codAvailable: boolean;
} | null {
  if (!/^[1-9][0-9]{5}$/.test(pincode)) return null;
  if (PINCODE_DIRECTORY[pincode]) {
    const match = PINCODE_DIRECTORY[pincode];
    return {
      serviceable: true,
      city: match.city,
      state: match.state,
      estimatedDays: match.days,
      codAvailable: true,
    };
  }
  const firstDigit = pincode[0];
  const regionMap: Record<string, { city: string; state: string; days: number }> = {
    '1': { city: 'Delhi NCR / North Zone', state: 'Delhi', days: 3 },
    '2': { city: 'Lucknow / North-Central', state: 'Uttar Pradesh', days: 4 },
    '3': { city: 'Jaipur / West Zone', state: 'Rajasthan', days: 3 },
    '4': { city: 'Mumbai / Maharashtra', state: 'Maharashtra', days: 3 },
    '5': { city: 'Bengaluru / South Zone', state: 'Karnataka', days: 3 },
    '6': { city: 'Chennai / South Coastal', state: 'Tamil Nadu', days: 4 },
    '7': { city: 'Kolkata / East Zone', state: 'West Bengal', days: 4 },
    '8': { city: 'Patna / Eastern Belt', state: 'Bihar', days: 5 },
  };
  const fallback = regionMap[firstDigit] || { city: 'India Serviceable Zone', state: 'India', days: 5 };
  return {
    serviceable: true,
    city: fallback.city,
    state: fallback.state,
    estimatedDays: fallback.days,
    codAvailable: true,
  };
}
