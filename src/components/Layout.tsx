import { ArrowUp, Heart, Mail, Menu, Phone, Search, ShoppingBag, User, X } from 'lucide-react';
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
} from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useBag } from '../hooks/useBag';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { smoothScrollToTop, useSmoothWheelScroll } from '../hooks/useSmoothWheelScroll';
import { BagDrawer } from './BagDrawer';
import { ClickMotionLayer } from './ClickMotionLayer';
import { FlyToBagOverlay } from './FlyToBagOverlay';
import { SearchOverlay } from './SearchOverlay';

export function Layout({ children }: { children: ReactNode }) {
  const { itemCount, wishlistIds, openBag } = useBag();
  const { user } = useAuth();
  const { shouldSimplify } = useReducedMotion();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showBackTop, setShowBackTop] = useState(false);
  const [bagBump, setBagBump] = useState(false);
  const prevCountRef = useRef(itemCount);

  useSmoothWheelScroll();

  const { scrollY, scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 240,
    damping: 34,
    restDelta: 0.001,
  });

  useMotionValueEvent(scrollY, 'change', (latest) => {
    const next = latest > 420;
    if (next !== showBackTop) setShowBackTop(next);
  });

  useEffect(() => {
    if (itemCount > prevCountRef.current) {
      setBagBump(true);
      const t = window.setTimeout(() => setBagBump(false), 450);
      prevCountRef.current = itemCount;
      return () => window.clearTimeout(t);
    }
    prevCountRef.current = itemCount;
  }, [itemCount]);

  const navLinks = [
    { to: '/collections/all', label: 'Shop' },
    { to: '/collections/kurtas', label: 'Kurtas' },
    { to: '/showcase', label: 'Showcase' },
    { to: '/collections/new', label: 'New' },
    { to: '/collections/sale', label: 'Sale' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5EF] text-[#1F2A1C]">
      {/* Strict 3-zone Top Bar Contract in Signature Sage */}
      <header className="sticky top-0 z-40 bg-[#9CAF88] border-b border-[#7F956B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <motion.button
              type="button"
              whileTap={shouldSimplify ? undefined : { scale: 0.9 }}
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="md:hidden p-2 -ml-2 rounded-md text-[#1F2A1C] hover:bg-[#8EA379] min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </motion.button>
            <Link
              to="/"
              className="font-display text-2xl font-bold tracking-tight text-[#1F2A1C] whitespace-nowrap shrink-0"
            >
              WICKED
            </Link>
          </div>

          {/* Zone 2: 5 concise single-line nav links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#1F2A1C]" aria-label="Main Navigation">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                    isActive
                      ? 'border-[#1F2A1C] font-semibold'
                      : 'border-transparent hover:border-[#1F2A1C]/60'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Zone 3: Primary Action Cluster */}
          <div className="flex items-center gap-2 shrink-0">
            <motion.button
              type="button"
              whileTap={shouldSimplify ? undefined : { scale: 0.9 }}
              onClick={() => setSearchOpen(true)}
              aria-label="Search garments"
              className="p-2 rounded-md text-[#1F2A1C] hover:bg-[#8EA379] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <Search className="w-5 h-5" />
            </motion.button>

            <Link
              to="/wishlist"
              aria-label={`Wishlist, ${wishlistIds.length} saved items`}
              className="p-2 rounded-md text-[#1F2A1C] hover:bg-[#8EA379] transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-1"
            >
              <motion.span
                key={wishlistIds.length}
                initial={shouldSimplify ? false : { scale: 1.28 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                className="inline-flex"
              >
                <Heart className={`w-5 h-5 ${wishlistIds.length > 0 ? 'fill-[#1F2A1C]' : ''}`} />
              </motion.span>
              {wishlistIds.length > 0 && (
                <span className="text-xs font-bold tabular-nums">{wishlistIds.length}</span>
              )}
            </Link>

            <Link
              to={user?.isAdmin ? '/admin' : '/account'}
              aria-label={user ? 'Account & Orders' : 'Sign in'}
              className="p-2 rounded-md text-[#1F2A1C] hover:bg-[#8EA379] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <User className="w-5 h-5" />
            </Link>

            <motion.button
              id="wicked-bag-btn"
              type="button"
              whileTap={shouldSimplify ? undefined : { scale: 0.93 }}
              animate={
                bagBump && !shouldSimplify
                  ? { scale: [1, 1.12, 0.95, 1] }
                  : { scale: 1 }
              }
              transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
              onClick={openBag}
              aria-label={`Open shopping bag, ${itemCount} items`}
              className="px-3.5 py-2 rounded-md bg-[#F7F5EF] text-[#1F2A1C] border border-[#1F2A1C]/20 hover:bg-[#E7ECE0] transition-colors text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 min-h-[44px]"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="tabular-nums">Bag ({itemCount})</span>
            </motion.button>
          </div>
        </div>

        {/* GPU-Composited Scroll Progress Bar */}
        {!shouldSimplify && (
          <motion.div
            aria-hidden="true"
            style={{ scaleX: smoothProgress }}
            className="h-[2px] w-full bg-[#1F2A1C]/75 origin-left"
          />
        )}

        {/* Mobile Nav Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              aria-label="Mobile Navigation"
              initial={shouldSimplify ? { opacity: 0 } : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldSimplify ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="md:hidden bg-[#9CAF88] border-t border-[#7F956B] px-4 py-4 space-y-2"
            >
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2.5 px-3 rounded-md text-base font-medium text-[#1F2A1C] hover:bg-[#8EA379]"
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-2 border-t border-[#7F956B] grid grid-cols-2 gap-2">
                <Link
                  to="/account"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 px-3 text-center rounded-md bg-[#F7F5EF] text-sm font-semibold"
                >
                  Account &amp; Orders
                </Link>
                <Link
                  to="/track-order"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 px-3 text-center rounded-md bg-[#F7F5EF] text-sm font-semibold"
                >
                  Track Order
                </Link>
                <Link
                  to="/wishlist"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 px-3 text-center rounded-md bg-[#E7ECE0] text-sm font-semibold"
                >
                  Wishlist ({wishlistIds.length})
                </Link>
                {user?.isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2.5 px-3 text-center rounded-md bg-[#E7ECE0] text-sm font-semibold"
                  >
                    Admin
                  </Link>
                )}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-[#9CAF88] border-t border-[#7F956B] text-[#1F2A1C] mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <p className="font-display text-2xl font-bold tracking-tight">WICKED</p>
            <p className="text-sm mt-3 max-w-md leading-relaxed text-[#1F2A1C]/90">
              Contemporary Indian streetwear, ethnic fusion kurtas, and heavyweight organic cotton essentials designed between Jaipur and Bengaluru.
            </p>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <a
                href="mailto:harshuljain923@gmail.com"
                className="inline-flex items-center gap-2 font-medium hover:underline"
              >
                <Mail className="w-4 h-4 shrink-0" />
                <span>harshuljain923@gmail.com</span>
              </a>
              <a
                href="tel:+917665712877"
                className="inline-flex items-center gap-2 font-medium tabular-nums hover:underline"
              >
                <Phone className="w-4 h-4 shrink-0" />
                <span>+91 76657 12877</span>
              </a>
            </div>
          </div>

          <div>
            <p className="font-display text-sm font-bold mb-3">Shop</p>
            <ul className="space-y-2 text-sm">
              <li><Link to="/collections/tees" className="hover:underline">Heavyweight Tees</Link></li>
              <li><Link to="/collections/kurtas" className="hover:underline">Fusion Kurtas</Link></li>
              <li><Link to="/collections/hoodies" className="hover:underline">420 GSM Hoodies</Link></li>
              <li><Link to="/collections/bottoms" className="hover:underline">Pleated Bottoms</Link></li>
              <li><Link to="/showcase" className="hover:underline">Interactive Showcase</Link></li>
            </ul>
          </div>

          <div>
            <p className="font-display text-sm font-bold mb-3">Policies &amp; Support</p>
            <ul className="space-y-2 text-sm">
              <li><Link to="/track-order" className="hover:underline">Track Your Order</Link></li>
              <li><Link to="/wishlist" className="hover:underline">Saved Wishlist</Link></li>
              <li><Link to="/policies/shipping" className="hover:underline">Shipping Policy</Link></li>
              <li><Link to="/policies/returns" className="hover:underline">Returns &amp; 7-Day Exchange</Link></li>
              <li><Link to="/policies/privacy" className="hover:underline">Privacy Policy</Link></li>
              <li><Link to="/policies/terms" className="hover:underline">Terms of Service</Link></li>
              <li><Link to="/policies/contact" className="hover:underline">Contact Studio</Link></li>
              <li><Link to="/admin" className="hover:underline">Admin Console</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[#7F956B] px-4 sm:px-6 py-4 text-xs flex flex-col sm:flex-row justify-between items-center gap-2 max-w-7xl mx-auto">
          <span>© {new Date().getFullYear()} Wicked Apparel India Pvt. Ltd. All rights reserved.</span>
          <span>Free delivery over ₹1,499 · Cash on Delivery · UPI &amp; Cards via Razorpay</span>
        </div>
      </footer>

      {/* Smooth Back-to-Top Floating Button */}
      <AnimatePresence>
        {showBackTop && (
          <motion.button
            type="button"
            initial={shouldSimplify ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={shouldSimplify ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.9 }}
            whileTap={shouldSimplify ? undefined : { scale: 0.9 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => smoothScrollToTop(shouldSimplify)}
            aria-label="Scroll back to top"
            className="hidden md:flex fixed bottom-6 right-6 z-30 w-11 h-11 rounded-full bg-[#9CAF88] border border-[#7F956B] text-[#1F2A1C] items-center justify-center hover:bg-[#8EA379] shadow-sm"
          >
            <ArrowUp className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>

      <BagDrawer />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <FlyToBagOverlay />
      <ClickMotionLayer />
    </div>
  );
}
