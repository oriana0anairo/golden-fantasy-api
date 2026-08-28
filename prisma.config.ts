import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Configuración del CLI de Prisma (migrate, generate, db seed).
 * El cliente en runtime NO usa este archivo: se conecta vía adaptador
 * en `src/lib/db.ts` con `DATABASE_URL`.
 *
 * Para migraciones se prefiere `DIRECT_URL` (conexión directa a Postgres,
 * puerto 5432 en Supabase). El pooler de `DATABASE_URL` no soporta DDL.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
  },
});
