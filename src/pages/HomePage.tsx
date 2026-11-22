import { ArrowRight } from 'lucide-react';
import { motion, useScroll, useSpring, useTransform } from 'motion/react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import {
  IMG_ACCESSORY_SLING,
  IMG_BOTTOMS_SAND,
  IMG_HOODIE_FRONT,
  IMG_KURTA_SAGE,
  IMG_SHIRT_OFFWHITE,
  IMG_TEE_SAGE,
  SEED_BANNER,
  SEED_PRODUCTS,
  SEED_SHOWCASE,
} from '../data/seedData';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import { useReducedMotion } from '../hooks/useReducedMotion';
import type { BannerConfig, Product, ShowcaseData } from '../types';

const LazyShowcaseSection = lazy(() =>
  import('../components/showcase/ShowcaseSection').then((m) => ({
    default: m.ShowcaseSection,
  }))
);

export function HomePage() {
  const { shouldSimplify } = useReducedMotion();
  const [products, setProducts] = useState<Product[]>(SEED_PRODUCTS);
  const [banner, setBanner] = useState<BannerConfig>(SEED_BANNER);
  const [showcase, setShowcase] = useState<ShowcaseData>(SEED_SHOWCASE);

  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const smoothScroll = useSpring(scrollYProgress, {
    stiffness: 150,
    damping: 26,
    mass: 0.3,
  });
  const floatY1 = useTransform(smoothScroll, [0, 1], [0, -32]);
  const floatY2 = useTransform(smoothScroll, [0, 1], [0, 26]);

  useDocumentMeta({
    title: 'Wicked — Indian Streetwear, Ethnic Fusion & Everyday Basics',
    description:
      'Heavyweight 280-420 GSM organic cotton tees, mandarin-collar kurtas, boxy hoodies, and relaxed bottoms crafted in India.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Store',
      name: 'Wicked',
      description:
        'Indian streetwear, ethnic fusion kurtas, and everyday basics crafted with organic cotton.',
      url: window.location.origin,
      priceRange: '₹899 - ₹3,999',
    },
  });

  useEffect(() => {
    import('../lib/staticStore').then(({ getStaticBanner, getStaticProducts, tryApiJson }) => {
      tryApiJson<{ products?: Product[]; banner?: BannerConfig; showcase?: ShowcaseData }>('/api/showcase').then(
        (api) => {
          if (api.available && api.ok) {
            if (api.data?.products) setProducts(api.data.products);
            if (api.data?.banner) setBanner(api.data.banner);
            if (api.data?.showcase) setShowcase(api.data.showcase);
          } else {
            setProducts(getStaticProducts());
            setBanner(getStaticBanner());
          }
        }
      );
    });
  }, []);

  const featuredProducts = products.filter((p) => p.featured).slice(0, 6);
  const { getProducts: getRecentProducts } = useRecentlyViewed();
  const recentProducts = getRecentProducts(products, undefined, 3);

  const categoryCards = [
    { slug: 'tees', label: 'Tees', detail: '280 GSM Heavyweight', image: IMG_TEE_SAGE },
    { slug: 'kurtas', label: 'Kurtas', detail: 'Handloom Fusion', image: IMG_KURTA_SAGE },
    { slug: 'shirts', label: 'Shirts', detail: 'Resort & Poplin', image: IMG_SHIRT_OFFWHITE },
    { slug: 'hoodies', label: 'Hoodies', detail: '420 GSM Loopback', image: IMG_HOODIE_FRONT },
    { slug: 'bottoms', label: 'Bottoms', detail: 'Pleated & Cargo', image: IMG_BOTTOMS_SAND },
    { slug: 'accessories', label: 'Objects', detail: 'Waxed Canvas', image: IMG_ACCESSORY_SLING },
  ];

  return (
    <div>
      {/* Hero Section */}
      <section ref={heroRef} className="bg-[#9CAF88]/25 border-b border-[#C5D1B8] overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-6">
            <motion.p
              initial={shouldSimplify ? { opacity: 1 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="text-xs font-medium text-[#4D5A48]"
            >
              Indian Streetwear · Ethnic Fusion · Everyday Basics
            </motion.p>

            <motion.h1
              initial={shouldSimplify ? { opacity: 1 } : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: shouldSimplify ? 0 : 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#1F2A1C] leading-[1.06]"
              style={{ textWrap: 'balance' }}
            >
              {banner.headline}
            </motion.h1>

            <motion.p
              initial={shouldSimplify ? { opacity: 1 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: shouldSimplify ? 0 : 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="text-base sm:text-lg text-[#4D5A48] max-w-xl leading-relaxed"
            >
              {banner.subheadline}
            </motion.p>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <Link
                to={banner.ctaPath}
                className="px-6 py-3.5 rounded-md bg-[#9CAF88] text-[#1F2A1C] font-bold text-base hover:bg-[#8EA379] transition-colors inline-flex items-center gap-2 whitespace-nowrap"
              >
                <span>{banner.ctaLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/showcase"
                className="px-6 py-3.5 rounded-md bg-[#F7F5EF] border border-[#C5D1B8] text-[#1F2A1C] font-semibold text-base hover:bg-[#E7ECE0] transition-colors whitespace-nowrap"
              >
                Open Interactive Studio
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6 relative">
            <div className="aspect-[16/10] sm:aspect-[16/9] rounded-lg overflow-hidden border border-[#C5D1B8] bg-[#E7ECE0]">
              <img
                src={banner.heroImage}
                alt="Wicked Jaipur courtyard campaign"
                width={1280}
                height={720}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            {!shouldSimplify && (
              <>
                <motion.div
                  style={{ y: floatY1 }}
                  className="hidden sm:block absolute -bottom-5 -left-4 w-28 aspect-[3/4] rounded-md overflow-hidden border border-[#C5D1B8] bg-[#F7F5EF]"
                >
                  <img
                    src={IMG_KURTA_SAGE}
                    alt="Mandarin Handloom Kurta"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </motion.div>
                <motion.div
                  style={{ y: floatY2 }}
                  className="hidden sm:block absolute -top-5 -right-3 w-24 aspect-[3/4] rounded-md overflow-hidden border border-[#C5D1B8] bg-[#F7F5EF]"
                >
                  <img
                    src={IMG_HOODIE_FRONT}
                    alt="420 GSM Sage Hoodie"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </motion.div>
              </>
            )}
          </div>
        </div>

        {/* Looping Marquee Strip */}
        <div className="bg-[#9CAF88] border-t border-[#7F956B] py-2.5 overflow-hidden">
          <div className="flex whitespace-nowrap animate-wicked-marquee">
            {Array.from({ length: 6 }).map((_, idx) => (
              <span
                key={idx}
                className="text-xs sm:text-sm font-semibold text-[#1F2A1C] mx-6 tracking-wide"
              >
                {banner.marqueeText}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Shop by Category Visual Strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-medium text-[#4D5A48]">Silhouettes &amp; Objects</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold mt-1 text-[#1F2A1C]">
              Shop by Category
            </h2>
          </div>
          <Link to="/collections/all" className="text-xs font-semibold text-[#1F2A1C] underline">
            View full catalog
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categoryCards.map((cat, idx) => (
            <motion.div
              key={cat.slug}
              initial={shouldSimplify ? { opacity: 1 } : { opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              whileHover={shouldSimplify ? undefined : { y: -3 }}
              whileTap={shouldSimplify ? undefined : { scale: 0.97 }}
              transition={{
                duration: 0.32,
                delay: shouldSimplify ? 0 : idx * 0.04,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <Link
                to={`/collections/${cat.slug}`}
                className="group block bg-[#FCFBF7] border border-[#C5D1B8] rounded-lg overflow-hidden hover:border-[#1F2A1C] transition-colors"
              >
                <div className="aspect-[3/4] bg-[#E7ECE0] overflow-hidden">
                  <img
                    src={cat.image}
                    alt={cat.label}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="p-3">
                  <p className="font-display text-sm font-bold text-[#1F2A1C]">{cat.label}</p>
                  <p className="text-[11px] text-[#4D5A48]">{cat.detail}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured Collection */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-medium text-[#4D5A48]">Drop 04 · Essential Silhouettes</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mt-1 text-[#1F2A1C]">
              Featured Collection
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { slug: 'tees', label: 'Tees' },
              { slug: 'kurtas', label: 'Kurtas' },
              { slug: 'shirts', label: 'Shirts' },
              { slug: 'hoodies', label: 'Hoodies' },
              { slug: 'bottoms', label: 'Bottoms' },
              { slug: 'accessories', label: 'Accessories' },
            ].map((cat) => (
              <Link
                key={cat.slug}
                to={`/collections/${cat.slug}`}
                className="px-3.5 py-1.5 rounded-md bg-[#E7ECE0] border border-[#C5D1B8] text-xs font-semibold text-[#1F2A1C] hover:bg-[#9CAF88] transition-colors whitespace-nowrap"
              >
                {cat.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {featuredProducts.map((product, idx) => (
            <motion.div
              key={product.id}
              initial={shouldSimplify ? { opacity: 1 } : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{
                duration: 0.4,
                delay: shouldSimplify ? 0 : Math.min(idx * 0.06, 0.24),
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Code-Split Lazy Interactive Showcase */}
      <Suspense
        fallback={
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
            <div className="h-96 rounded-lg bg-[#E7ECE0] border border-[#C5D1B8] flex items-center justify-center">
              <span className="text-sm text-[#4D5A48]">Preparing Showcase...</span>
            </div>
          </div>
        }
      >
        <LazyShowcaseSection showcase={showcase} products={products} mode="compact" />
      </Suspense>

      {recentProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-8">
          <div className="flex items-end justify-between gap-4 mb-6">
            <h2 className="font-display text-2xl font-bold text-[#1F2A1C]">Recently Viewed</h2>
            <Link to="/wishlist" className="text-xs font-semibold text-[#1F2A1C] underline">
              Open Wishlist
            </Link>
          </div>
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
