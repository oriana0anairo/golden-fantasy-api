import { OrderStatus, type Order, type Product, ProductStatus } from '@prisma/client';
import { prisma } from '../../lib';

/** Acceso a datos de pedidos. Nadie más habla con Prisma para `Order`. */

export function findProductsByIds(ids: string[]): Promise<Product[]> {
  return prisma.product.findMany({ where: { id: { in: ids } } });
}

export interface NuevaOrden {
  buyerId: string;
  shipping: { name: string; address: string; city: string; phone: string };
  subtotal: number;
  total: number;
  items: Array<{ productId: string; quantity: number; unitPrice: number; subtotal: number }>;
}

export function createOrder(nueva: NuevaOrden): Promise<Order> {
  return prisma.order.create({
    data: {
      buyerId: nueva.buyerId,
      shippingName: nueva.shipping.name,
      shippingAddress: nueva.shipping.address,
      shippingCity: nueva.shipping.city,
      shippingPhone: nueva.shipping.phone,
      subtotal: nueva.subtotal,
      total: nueva.total,
      items: { create: nueva.items },
    },
  });
}

export function savePreferenceId(orderId: string, preferenceId: string): Promise<Order> {
  return prisma.order.update({ where: { id: orderId }, data: { mercadopagoPreferenceId: preferenceId } });
}

/** Por qué una notificación no cambió nada: hay que distinguirlos para el log. */
export type ResultadoTransicion = 'aplicada' | 'ya_procesada' | 'orden_desconocida';

/**
 * Marca la orden como pagada y descuenta stock, todo en una transacción.
 * Si la orden ya no está PENDING no hace nada: esa es la garantía de
 * idempotencia, porque Mercado Pago reintenta la misma notificación.
 */
export function marcarPagadaYDescontarStock(
  orderId: string,
  paymentId: string,
): Promise<{ resultado: ResultadoTransicion; sinStock: string[] }> {
  return prisma.$transaction(async (tx) => {
    const existe = await tx.order.findUnique({ where: { id: orderId }, select: { id: true } });
    if (!existe) return { resultado: 'orden_desconocida' as const, sinStock: [] };

    const cambiadas = await tx.order.updateMany({
      where: { id: orderId, status: OrderStatus.PENDING },
      data: { status: OrderStatus.PAID, mercadopagoPaymentId: paymentId },
    });

    if (cambiadas.count === 0) return { resultado: 'ya_procesada' as const, sinStock: [] };

    const items = await tx.orderItem.findMany({ where: { orderId } });
    const sinStock: string[] = [];

    // Un update por ítem (máximo 5): cada uno necesita su propia condición
    // de stock suficiente, para no dejar unidades en negativo.
    for (const item of items) {
      const descontado = await tx.product.updateMany({
        where: { id: item.productId, stockQuantity: { gte: item.quantity } },
        data: { stockQuantity: { decrement: item.quantity } },
      });
      if (descontado.count === 0) sinStock.push(item.productId);
    }

    return { resultado: 'aplicada' as const, sinStock };
  });
}

/** Marca la orden como fallida. No toca stock (nunca se descontó). */
export async function marcarFallida(orderId: string, paymentId: string): Promise<ResultadoTransicion> {
  const existe = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true } });
  if (!existe) return 'orden_desconocida';

  const cambiadas = await prisma.order.updateMany({
    where: { id: orderId, status: OrderStatus.PENDING },
    data: { status: OrderStatus.FAILED, mercadopagoPaymentId: paymentId },
  });
  return cambiadas.count > 0 ? 'aplicada' : 'ya_procesada';
}

export { ProductStatus };
