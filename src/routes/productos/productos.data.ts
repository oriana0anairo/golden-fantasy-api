import type { Product } from '@prisma/client';
import { prisma } from '../../lib';
import type { ListProductsQuery } from './productos.schema';

/** Acceso a datos de productos. Nadie más habla con Prisma para `Product`. */

export function findAvailableProducts(filters: ListProductsQuery): Promise<Product[]> {
  return prisma.product.findMany({
    where: {
      available: true,
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              { category: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
}

export function findAvailableProductById(id: string): Promise<Product | null> {
  return prisma.product.findFirst({ where: { id, available: true } });
}
