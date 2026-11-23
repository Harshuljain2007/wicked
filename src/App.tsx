import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { EntryLoginGate } from './components/EntryLoginGate';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { BagProvider } from './hooks/useBag';
import { useReducedMotion } from './hooks/useReducedMotion';
import { HomePage } from './pages/HomePage';

const CollectionPage = lazy(() =>
  import('./pages/CollectionPage').then((m) => ({ default: m.CollectionPage }))
);
const ProductDetailPage = lazy(() =>
  import('./pages/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage }))
);
const ShowcasePage = lazy(() =>
  import('./pages/ShowcasePage').then((m) => ({ default: m.ShowcasePage }))
);
const CheckoutPage = lazy(() =>
  import('./pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage }))
);
const OrderConfirmationPage = lazy(() =>
  import('./pages/OrderConfirmationPage').then((m) => ({ default: m.OrderConfirmationPage }))
);
const AccountPage = lazy(() =>
  import('./pages/AccountPage').then((m) => ({ default: m.AccountPage }))
);
const AdminPage = lazy(() =>
  import('./pages/AdminPage').then((m) => ({ default: m.AdminPage }))
);
const PolicyPage = lazy(() =>
  import('./pages/PolicyPage').then((m) => ({ default: m.PolicyPage }))
);
const WishlistPage = lazy(() =>
  import('./pages/WishlistPage').then((m) => ({ default: m.WishlistPage }))
);
const TrackOrderPage = lazy(() =>
  import('./pages/TrackOrderPage').then((m) => ({ default: m.TrackOrderPage }))
);

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppShell() {
  const { user, loading } = useAuth();
  const { shouldSimplify } = useReducedMotion();
  const location = useLocation();
  const { pathname } = location;
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void import('./pages/CollectionPage');
      void import('./pages/ProductDetailPage');
      void import('./pages/ShowcasePage');
      void import('./pages/CheckoutPage');
      void import('./pages/WishlistPage');
      void import('./pages/AccountPage');
    }, 900);
    return () => window.clearTimeout(timer);
  }, []);

  const [guestEntered, setGuestEntered] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('wicked_guest_entered') === '1';
    } catch {
      return false;
    }
  });

  const bypassRoutes =
    pathname.startsWith('/order/') ||
    pathname.startsWith('/policies/') ||
    pathname.startsWith('/track-order');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F5EF] text-[#1F2A1C] flex items-center justify-center text-sm text-[#4D5A48]">
        Loading Wicked...
      </div>
    );
  }

  if (!user && !guestEntered && !bypassRoutes) {
    return (
      <EntryLoginGate
        onContinueAsGuest={() => {
          try {
            sessionStorage.setItem('wicked_guest_entered', '1');
          } catch {
            // Ignore storage restrictions
          }
          setGuestEntered(true);
        }}
      />
    );
  }

  return (
    <Layout>
      <Suspense
        fallback={
          <div className="max-w-7xl mx-auto px-4 py-20 text-center text-sm text-[#4D5A48]">
            Loading...
          </div>
        }
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={pathname}
            initial={shouldSimplify ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldSimplify ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <Routes location={location}>
              <Route path="/" element={<HomePage />} />
              <Route path="/collections/:slug" element={<CollectionPage />} />
              <Route path="/product/:slug" element={<ProductDetailPage />} />
              <Route path="/showcase" element={<ShowcasePage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/order/:id" element={<OrderConfirmationPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/track-order" element={<TrackOrderPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/policies/:type" element={<PolicyPage />} />
              <Route path="*" element={<HomePage />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </Suspense>
    </Layout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <BagProvider>
            <BrowserRouter basename={import.meta.env.BASE_URL}>
              <ScrollToTop />
              <AppShell />
            </BrowserRouter>
          </BagProvider>
        </AuthProvider>
      </MotionConfig>
    </ErrorBoundary>
  );
}
