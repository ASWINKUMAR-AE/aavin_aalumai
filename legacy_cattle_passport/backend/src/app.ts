import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { env } from './config/env.js';
import { checkDatabaseConnection } from './config/database.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './modules/auth/auth.routes.js';
import farmersRoutes from './modules/farmers/farmers.routes.js';
import cowsRoutes from './modules/cows/cows.routes.js';
import veterinaryRoutes from './modules/veterinary/veterinary.routes.js';
import feedingRoutes from './modules/feeding/feeding.routes.js';
import productionRoutes from './modules/production/production.routes.js';
import collectionRoutes from './modules/collection/collection.routes.js';
import batchesRoutes from './modules/batches/batches.routes.js';
import paymentsRoutes from './modules/payments/payments.routes.js';
import notificationsRoutes from './modules/notifications/notifications.routes.js';
import aiRoutes from './modules/ai/ai.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import workflowRoutes from './modules/workflow/workflow.routes.js';

export function createApp(): Express {
  const app = express();

  // Security Middleware
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdnjs.cloudflare.com"],
          scriptSrcAttr: ["'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
          imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https:"],
          connectSrc: ["'self'", "*"],
        },
      },
    })
  );

  // CORS Configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, postman)
        if (!origin) return callback(null, true);
        if (env.FRONTEND_ORIGINS.length === 0 || env.FRONTEND_ORIGINS.includes(origin) || env.NODE_ENV === 'development') {
          return callback(null, true);
        }
        return callback(null, true); // Permissive in dev/LAN for Expo Go
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  if (env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Serve static public assets & QR Portal Web UI
  app.use(express.static(path.resolve(__dirname, '../public')));

  // Direct QR Portal route
  app.get(['/', '/qr-portal', '/qr-generator'], (req: Request, res: Response) => {
    res.sendFile(path.resolve(__dirname, '../public/index.html'));
  });

  // Health and Readiness Check
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      app: 'Aavin Smart Cattle Passport - Milk Safety Twin',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/ready', async (req: Request, res: Response) => {
    const isDbConnected = await checkDatabaseConnection();
    if (isDbConnected) {
      res.status(200).json({ status: 'ready', database: 'connected' });
    } else {
      res.status(503).json({ status: 'unready', database: 'disconnected' });
    }
  });

  // Mount API v1 routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/farmers', farmersRoutes);
  app.use('/api/v1/cows', cowsRoutes);
  app.use('/api/v1/veterinary', veterinaryRoutes);
  app.use('/api/v1/feeding', feedingRoutes);
  app.use('/api/v1/production', productionRoutes);
  app.use('/api/v1/collections', collectionRoutes);
  app.use('/api/v1/batches', batchesRoutes);
  app.use('/api/v1/payments', paymentsRoutes);
  app.use('/api/v1/notifications', notificationsRoutes);
  app.use('/api/v1/ai', aiRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/workflow', workflowRoutes);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: `Route ${req.method} ${req.originalUrl} not found`,
    });
  });

  // Global Centralized Error Handler
  app.use(errorHandler);

  return app;
}
