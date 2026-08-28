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
