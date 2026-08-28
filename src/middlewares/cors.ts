import cors, { type CorsOptions } from 'cors';
import { allowedOrigins } from '../config';

/**
 * CORS restringido a la(s) URL(s) del frontend (`CORS_ORIGIN`).
 * Las peticiones servidor-a-servidor no mandan `Origin`: se dejan pasar,
 * porque igual quedan protegidas por el JWT.
 */
const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`Origen no permitido por CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

export const corsMiddleware = cors(corsOptions);
