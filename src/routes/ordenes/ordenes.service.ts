import type { Product } from '@prisma/client';
import { createPreference, HttpError } from '../../lib';
import { frontendUrl, publicUrl } from '../../config';
import { createOrder, findProductsByIds, ProductStatus, savePreferenceId } from './ordenes.data';
import { MAX_UNIDADES_POR_PRODUCTO, type CrearOrdenDTO, type ItemPedido } from './ordenes.schema';

export interface OrdenCreada {
  orderId: string;
  initPoint: string;
}

/** Rutas del frontend a las que Mercado Pago devuelve al comprador. */
const BACK_URLS = {
  success: `${frontendUrl}/checkout/exito`,
  failure: `${frontendUrl}/checkout/fallo`,
  pending: `${frontendUrl}/checkout/pendiente`,
};

/** Si el mismo producto llega repetido, se suma: el tope aplica al total. */
function agruparPorProducto(items: ItemPedido[]): Map<string, number> {
  const agrupados = new Map<string, number>();
  for (const item of items) {
    agrupados.set(item.productId, (agrupados.get(item.productId) ?? 0) + item.quantity);
  }
  return agrupados;
}

function motivoDeRechazo(producto: Product | undefined, cantidad: number): string | null {
  if (!producto) return 'No existe';
  if (producto.status !== ProductStatus.PUBLISHED) return 'No está publicado';
  if (producto.stockQuantity < 1) return 'Sin unidades disponibles';

  const maximo = Math.min(MAX_UNIDADES_POR_PRODUCTO, producto.stockQuantity);
  if (cantidad > maximo) return `El máximo disponible es ${maximo}`;

  return null;
}

/**
 * Crea el pedido y su preferencia de pago.
 * Los precios salen SIEMPRE de la base: lo que mande el frontend se ignora.
 */
export async function crearOrden(buyerId: string, input: CrearOrdenDTO): Promise<OrdenCreada> {
  const cantidades = agruparPorProducto(input.items);
  const productos = await findProductsByIds([...cantidades.keys()]);
  const porId = new Map(productos.map((p) => [p.id, p]));

  const rechazados = [...cantidades].flatMap(([productId, cantidad]) => {
    const motivo = motivoDeRechazo(porId.get(productId), cantidad);
    return motivo ? [{ productId, motivo }] : [];
  });

  if (rechazados.length > 0) {
    throw HttpError.badRequest(
      'Algunos productos del pedido no se pueden comprar',
      'ITEMS_INVALIDOS',
      rechazados,
    );
  }

  const items = [...cantidades].map(([productId, quantity]) => {
    const producto = porId.get(productId) as Product;
    return { productId, quantity, unitPrice: producto.price, subtotal: producto.price * quantity };
  });

  // Sin costo de envío en v1 (C4): el total es el subtotal.
  const subtotal = items.reduce((suma, item) => suma + item.subtotal, 0);
  const orden = await createOrder({ buyerId, shipping: input.shipping, subtotal, total: subtotal, items });

  const preferencia = await createPreference({
    orderId: orden.id,
    items: items.map((item) => ({
      id: item.productId,
      title: porId.get(item.productId)?.name ?? 'Pieza Golden Fantasy',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    backUrls: BACK_URLS,
    notificationUrl: `${publicUrl}/webhooks/mercadopago`,
  });

  await savePreferenceId(orden.id, preferencia.id);

  return { orderId: orden.id, initPoint: preferencia.initPoint };
}
