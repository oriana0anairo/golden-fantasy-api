import { z } from 'zod';

/**
 * Filtros de `GET /productos`. Con menos de 50 SKUs (ver doc de producto)
 * el catálogo se sirve completo y el frontend filtra en memoria, pero el
 * backend igual soporta ambos filtros para no depender de eso.
 */
export const listProductsSchema = z.object({
  category: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional(),
});

export type ListProductsQuery = z.infer<typeof listProductsSchema>;

export const productIdSchema = z.object({
  id: z.uuid('Identificador de producto inválido'),
});
