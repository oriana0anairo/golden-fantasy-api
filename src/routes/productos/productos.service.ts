import type { Product } from '@prisma/client';
import { HttpError } from '../../lib';
import { findAvailableProductById, findAvailableProducts } from './productos.data';
import type { ListProductsQuery } from './productos.schema';

/** Lo que ve el comprador: nunca se expone `available` (siempre es true acá). */
export interface ProductDTO {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  specs: unknown;
  imageUrl: string | null;
}

function toDTO(product: Product): ProductDTO {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    price: product.price,
    description: product.description,
    specs: product.specs,
    imageUrl: product.imageUrl,
  };
}

/** Catálogo público — solo piezas disponibles (cada artículo se vende una sola vez). */
export async function listProducts(filters: ListProductsQuery): Promise<ProductDTO[]> {
  const products = await findAvailableProducts(filters);
  return products.map(toDTO);
}

export async function getProductById(id: string): Promise<ProductDTO> {
  const product = await findAvailableProductById(id);

  if (!product) {
    throw HttpError.notFound('No encontramos esa pieza o ya no está disponible', 'PRODUCT_NOT_FOUND');
  }

  return toDTO(product);
}
