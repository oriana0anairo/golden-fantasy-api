import 'dotenv/config';
import { z } from 'zod';

/**
 * Única fuente de verdad para variables de entorno.
 * Se valida al arrancar: si falta algo, el proceso muere acá con un
 * mensaje claro, no con un error raro a mitad de una petición.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria (cadena de conexión de Postgres)'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:3000'),

  // --- Mercado Pago (épica 3) ---
  // Opcionales a propósito: sin ellas la API sigue levantando y sirviendo
  // catálogo y auth; solo `POST /ordenes` responde que el pago no está
  // configurado. Así una variable faltante no tumba todo el servicio.
  MERCADOPAGO_ACCESS_TOKEN: z.string().min(1).optional(),
  MERCADOPAGO_WEBHOOK_SECRET: z.string().min(1).optional(),
  MERCADOPAGO_API_URL: z.string().url().default('https://api.mercadopago.com'),

  /** URL pública del frontend, para las back_urls de retorno del pago. */
  FRONTEND_URL: z.string().url().optional(),
  /** URL pública de ESTE backend, para el notification_url del webhook. */
  PUBLIC_URL: z.string().url().optional(),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const detalle = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    console.error(`Variables de entorno inválidas:\n${detalle}`);
    process.exit(1);
  }

  return parsed.data;
}

export const env = loadEnv();

/** `CORS_ORIGIN` acepta varias URLs separadas por coma. */
export const allowedOrigins = env.CORS_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const isProduction = env.NODE_ENV === 'production';

/**
 * A dónde vuelve el comprador tras pagar. Si no se configura aparte, se usa
 * el primer origen de `CORS_ORIGIN`, que ya apunta al frontend.
 */
export const frontendUrl = (env.FRONTEND_URL ?? allowedOrigins[0] ?? 'http://localhost:3000').replace(/\/+$/, '');

/**
 * URL pública del backend para que Mercado Pago pueda llamar al webhook.
 * Render inyecta `RENDER_EXTERNAL_URL` solo, así que no hay que configurarla
 * a mano en ese hosting.
 */
export const publicUrl = (env.PUBLIC_URL ?? process.env.RENDER_EXTERNAL_URL ?? `http://localhost:${env.PORT}`).replace(/\/+$/, '');
