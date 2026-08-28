import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { env, isProduction } from '../config';

/**
 * Cliente Prisma único para toda la app.
 * Prisma 7 se conecta por adaptador de driver, no por `url` en el schema:
 * la cadena de conexión vive solo en `DATABASE_URL`.
 */
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma = new PrismaClient({
  adapter,
  log: isProduction ? ['error'] : ['warn', 'error'],
});

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
}
