import { ProductStatus, type Product } from '@prisma/client';
import { prisma } from '../../lib';
import type { ListProductsQuery } from './productos.schema';

/** Acceso a datos de productos. Nadie más habla con Prisma para `Product`. */

/**
 * Una pieza está en el catálogo si el taller la publicó y todavía queda
 * alguna unidad. Se vende una sola vez, así que al llegar a 0 desaparece.
 */
const enCatalogo = { status: ProductStatus.PUBLISHED, stockQuantity: { gt: 0 } };

export function findAvailableProducts(filters: ListProductsQuery): Promise<Product[]> {
  return prisma.product.findMany({
    where: {
      ...enCatalogo,
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
  return prisma.product.findFirst({ where: { id, ...enCatalogo } });
}
