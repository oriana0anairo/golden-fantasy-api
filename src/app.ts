import express, { type Express } from 'express';
import { corsMiddleware, errorHandler, notFoundHandler } from './middlewares';
import { apiRouter } from './routes';

/** Arma la app de Express. Sin `listen`: eso vive en `server.ts`. */
export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(corsMiddleware);
  app.use(express.json({ limit: '1mb' }));

  // Healthcheck para Railway/Render (no requiere base de datos).
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
  });

  app.use(apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
