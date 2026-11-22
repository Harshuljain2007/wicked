# Wicked — Indian Streetwear, Ethnic Fusion & Everyday Basics

Full-stack e-commerce storefront and studio console for **Wicked**, built with React, Vite, Tailwind CSS, Node.js, Express, Firebase (Firestore & Authentication), and Razorpay Standard Checkout.

## Tech Stack
- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS v4, Motion (`motion/react`), Lucide Icons, `jspdf` (GST Invoice PDF).
- **Backend**: Node.js, Express, Helmet, CORS, `express-rate-limit`, Zod validation, HMAC SHA256 payment & webhook verification.
- **Database & Auth**: Firebase Firestore + Firebase Authentication (Google Sign-In & Email OTP).
- **Payments**: Razorpay Standard Checkout (`checkout.js`) + Orders API + Refunds API + Cash on Delivery.

## Folder Structure
- `src/components/` — Core storefront UI (`Layout`, `BagDrawer`, `ProductCard`, `SearchOverlay`, `SizeGuideModal`, `FlyToBagOverlay`)
- `src/components/showcase/` — Lazy-loaded interactive showcase (`Showcase360Viewer`, `ShoppableLookbook`, `ColourwaySwitcher`, `FabricExplorer`, `OutfitBuilder`, `ScrollStory`)
- `src/pages/` — Storefront routes (`HomePage`, `CollectionPage`, `ProductDetailPage`, `ShowcasePage`, `CheckoutPage`, `OrderConfirmationPage`, `AccountPage`, `AdminPage`, `PolicyPage`)
- `src/hooks/` — Context & utility hooks (`useAuth`, `useBag`, `useDocumentMeta`, `useReducedMotion`)
- `src/data/` — 20 seeded Indian apparel products, 360° sequence, lookbook hotspots, coupons (`FIRST10`, `WICKED15`), and Indian pincode directory
- `server/lib/` — Configuration, authoritative catalog/pricing store, Razorpay HMAC & API client, auth middleware, rate limiters, GST calculator
- `server/routes/` — Express API routes (`/api/products`, `/api/auth`, `/api/payments`, `/api/orders`, `/api/admin`)

## Local Setup & Run
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and set your environment variables:
   ```bash
   cp .env.example .env
   ```
3. Start the full-stack development server (Express + Vite on port 3000):
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   npm start
   ```

## Environment Variables
| Variable | Purpose | Scope |
| :--- | :--- | :--- |
| `PORT` | Server port (defaults to `3000`) | Server |
| `APP_URL` | Canonical origin for `sitemap.xml` & CORS | Server |
| `ALLOWED_ORIGINS` | Comma-separated CORS allowlist | Server |
| `RAZORPAY_KEY_ID` | Razorpay Public Key ID (`rzp_test_...` or `rzp_live_...`) | Server |
| `RAZORPAY_KEY_SECRET` | Razorpay Key Secret (never exposed to browser) | Server only |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook HMAC secret from Razorpay Dashboard | Server only |
| `ADMIN_EMAIL` | Store owner email authorized for `/admin` | Server |

## Switching Razorpay from Test Mode to Live Mode
1. Complete KYC & activate Live Mode in your Razorpay Dashboard (ensure Shipping, Returns & Exchange, Privacy, Terms, and Contact pages are linked — all 5 exist under `/policies/*`).
2. Generate Live API Keys in **Razorpay Dashboard -> Account & Settings -> API Keys**.
3. Update `RAZORPAY_KEY_ID` (`rzp_live_...`) and `RAZORPAY_KEY_SECRET` in your production Secrets/environment variables.
4. Configure a Webhook in **Razorpay Dashboard -> Webhooks** pointing to:
   `https://<your-domain>/api/payments/webhook`
   Enable events: `payment.captured`, `payment.failed`, and `refund.processed`, and paste the Webhook Secret into `RAZORPAY_WEBHOOK_SECRET`.
5. Restart the server. When real keys are present, `/api/payments/create-order` automatically calls `https://api.razorpay.com/v1/orders` and opens `checkout.js` in live mode.

## Deployment
1. Run `npm run lint` and `npm run build` to verify TypeScript and Vite bundling.
2. Deploy `firestore.rules` via Firebase CLI (`firebase deploy --only firestore:rules`) or AI Studio.
3. Run `npm start` (`NODE_ENV=production tsx server.ts`) on your Node.js host (Cloud Run, Render, Railway, or Fly.io) with port `3000` exposed and environment variables configured.
