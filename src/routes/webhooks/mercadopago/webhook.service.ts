import { getPayment } from '../../../lib';
import { confirmarPago, type ResultadoConfirmacion } from '../../ordenes/confirmarPago';

/**
 * Mercado Pago notifica en varias formas según la integración:
 * `{ type, data: { id } }` en el cuerpo, o `topic`/`id` por query string.
 * Se aceptan todas y se ignora lo que no sea un pago.
 */
export function extraerPaymentId(body: unknown, query: Record<string, unknown>): string | null {
  const cuerpo = (body ?? {}) as { type?: string; topic?: string; data?: { id?: unknown }; id?: unknown };
  const tipo = String(cuerpo.type ?? cuerpo.topic ?? query.type ?? query.topic ?? '');

  if (tipo !== 'payment') return null;

  const id = cuerpo.data?.id ?? cuerpo.id ?? query['data.id'] ?? query.id;
  return id === undefined || id === null || id === '' ? null : String(id);
}

export type ResultadoWebhook = ResultadoConfirmacion | 'ignorado' | 'orden_desconocida';

/**
 * Consulta el pago real contra Mercado Pago y aplica el resultado al pedido.
 * Nunca confía en el estado que venga en la notificación.
 */
export async function procesarNotificacion(paymentId: string): Promise<ResultadoWebhook> {
  const pago = await getPayment(paymentId);

  if (!pago.externalReference) {
    console.error(`Pago ${paymentId} sin external_reference: no se puede asociar a un pedido.`);
    return 'orden_desconocida';
  }

  return confirmarPago(pago.externalReference, pago.id, pago.status);
}
