import path from 'path';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { SERVER_CONFIG } from './server/lib/config.ts';
import { adminRouter } from './server/routes/admin.ts';
import { authRouter } from './server/routes/auth.ts';
import { catalogRouter } from './server/routes/catalog.ts';
import { ordersRouter } from './server/routes/orders.ts';
import { paymentsRouter, razorpayWebhookHandler } from './server/routes/payments.ts';

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      frameguard: false,
    })
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          callback(null, true);
          return;
        }
        const allowed =
          SERVER_CONFIG.allowedOrigins.includes(origin) ||
          origin.includes('.run.app') ||
          origin.includes('localhost') ||
          origin.includes('127.0.0.1');
        callback(allowed ? null : new Error('CORS origin denied'), allowed);
      },
      credentials: true,
    })
  );

  // Razorpay webhook MUST receive raw body bytes for exact HMAC SHA256 signature verification
  app.post(
    '/api/payments/webhook',
    express.raw({ type: 'application/json' }),
    razorpayWebhookHandler
  );

  app.use(express.json({ limit: '4mb' }));

  app.use('/api', catalogRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/admin', adminRouter);

  app.get('/sitemap.xml', (req, res, next) => {
    req.url = '/sitemap.xml';
    catalogRouter(req, res, next);
  });

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(SERVER_CONFIG.port, '0.0.0.0', () => {
    console.log(`Wicked server running on http://0.0.0.0:${SERVER_CONFIG.port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Wicked server:', err);
  process.exit(1);
});
