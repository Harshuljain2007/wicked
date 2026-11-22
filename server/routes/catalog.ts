import { Router } from 'express';
import { z } from 'zod';
import { lookupIndianPincode } from '../../src/data/seedData.ts';
import { catalogStore } from '../lib/catalogStore.ts';
import { SERVER_CONFIG } from '../lib/config.ts';

export const catalogRouter = Router();

catalogRouter.get('/products', (req, res) => {
  const { category, gender, fit, size, color, minPrice, maxPrice, q, tag, sort } = req.query;
  let list = [...catalogStore.getProducts()];

  if (typeof category === 'string' && category !== 'all') {
    if (category === 'new') {
      list = list.filter((p) => p.isNew);
    } else if (category === 'sale') {
      list = list.filter((p) => p.onSale);
    } else {
      list = list.filter((p) => p.category === category);
    }
  }

  if (typeof tag === 'string') {
    if (tag === 'new') list = list.filter((p) => p.isNew);
    if (tag === 'sale') list = list.filter((p) => p.onSale);
  }

  if (typeof gender === 'string' && gender !== 'all') {
    list = list.filter((p) => p.gender === gender || p.gender === 'unisex');
  }

  if (typeof fit === 'string' && fit !== 'all') {
    list = list.filter((p) => p.fit.toLowerCase().includes(fit.toLowerCase()));
  }

  if (typeof size === 'string' && size !== 'all') {
    list = list.filter((p) => p.variants.some((v) => v.size === size && v.stock > 0));
  }

  if (typeof color === 'string' && color !== 'all') {
    list = list.filter((p) =>
      p.colors.some((c) => c.name.toLowerCase() === color.toLowerCase())
    );
  }

  if (typeof minPrice === 'string' && !Number.isNaN(Number(minPrice))) {
    list = list.filter((p) => p.price >= Number(minPrice));
  }

  if (typeof maxPrice === 'string' && !Number.isNaN(Number(maxPrice))) {
    list = list.filter((p) => p.price <= Number(maxPrice));
  }

  if (typeof q === 'string' && q.trim().length > 0) {
    const query = q.trim().toLowerCase();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        p.fabric.toLowerCase().includes(query) ||
        p.fit.toLowerCase().includes(query)
    );
  }

  if (sort === 'price_asc') {
    list.sort((a, b) => a.price - b.price);
  } else if (sort === 'price_desc') {
    list.sort((a, b) => b.price - a.price);
  } else if (sort === 'rating') {
    list.sort((a, b) => b.rating - a.rating);
  } else if (sort === 'newest') {
    list.sort((a, b) => Number(Boolean(b.isNew)) - Number(Boolean(a.isNew)));
  }

  res.json({ products: list });
});

catalogRouter.get('/products/:slug', (req, res) => {
  const product = catalogStore.getProductBySlug(req.params.slug);
  if (!product) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }
  const reviews = catalogStore.getReviewsForProduct(product.id);
  res.json({ product, reviews });
});

catalogRouter.get('/showcase', (_req, res) => {
  res.json({
    showcase: catalogStore.getShowcase(),
    banner: catalogStore.getBanner(),
    products: catalogStore.getProducts(),
  });
});

catalogRouter.get('/pincode/:pin', (req, res) => {
  const result = lookupIndianPincode(req.params.pin);
  if (!result) {
    res.status(400).json({ error: 'Enter a valid 6-digit Indian pincode.' });
    return;
  }
  res.json(result);
});

const couponSchema = z.object({
  code: z.string().min(2).max(32),
  subtotal: z.number().nonnegative(),
});

catalogRouter.post('/coupons/validate', (req, res) => {
  const parsed = couponSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ valid: false, reason: 'Invalid coupon request.' });
    return;
  }
  const check = catalogStore.validateCoupon(parsed.data.code, parsed.data.subtotal);
  res.json(check);
});

catalogRouter.get('/sitemap.xml', (_req, res) => {
  const baseUrl = SERVER_CONFIG.appUrl.replace(/\/+$/, '');
  const staticPaths = [
    '/',
    '/collections/all',
    '/collections/tees',
    '/collections/shirts',
    '/collections/kurtas',
    '/collections/hoodies',
    '/collections/bottoms',
    '/collections/accessories',
    '/collections/new',
    '/collections/sale',
    '/showcase',
    '/policies/shipping',
    '/policies/returns',
    '/policies/privacy',
    '/policies/terms',
    '/policies/contact',
  ];

  const productUrls = catalogStore
    .getProducts()
    .map((p) => `<url><loc>${baseUrl}/product/${p.slug}</loc><changefreq>weekly</changefreq></url>`)
    .join('');

  const staticUrls = staticPaths
    .map((p) => `<url><loc>${baseUrl}${p}</loc><changefreq>daily</changefreq></url>`)
    .join('');

  res.header('Content-Type', 'application/xml');
  res.send(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${staticUrls}${productUrls}</urlset>`
  );
});
