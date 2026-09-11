import { marcarFallida, marcarPagadaYDescontarStock } from '../ordenes.data';

/**
 * Traduce el estado que reporta Mercado Pago a lo que pasa con el pedido.
 * `approved` es el único que cobra; los estados intermedios (pending,
 * in_process, authorized) se dejan como están, porque todavía pueden
 * terminar en aprobado y no queremos cerrar el pedido antes de tiempo.
 */
const APROBADOS = new Set(['approved']);
const RECHAZADOS = new Set(['rejected', 'cancelled', 'refunded', 'charged_back']);

export type ResultadoConfirmacion =
  | 'pagada'
  | 'fallida'
  | 'sin_cambios'
  | 'ya_procesada'
  | 'orden_desconocida';

function avisarOrdenDesconocida(orderId: string, paymentId: string): 'orden_desconocida' {
  // No se le devuelve error a Mercado Pago (reintentaría sin remedio), pero
  // queda registrado: un pago sin pedido es algo que hay que mirar.
  console.error(`Pago ${paymentId} apunta al pedido ${orderId}, que no existe. Revisar manualmente.`);
  return 'orden_desconocida';
}

export async function confirmarPago(
  orderId: string,
  paymentId: string,
  estadoMercadoPago: string,
): Promise<ResultadoConfirmacion> {
  if (APROBADOS.has(estadoMercadoPago)) {
    const { resultado, sinStock } = await marcarPagadaYDescontarStock(orderId, paymentId);

    if (resultado === 'orden_desconocida') return avisarOrdenDesconocida(orderId, paymentId);
    if (resultado === 'ya_procesada') return 'ya_procesada';

    if (sinStock.length > 0) {
      // Se cobró pero el stock ya no alcanzaba (alguien compró antes). No se
      // deja en negativo: queda para que el taller lo resuelva a mano.
      console.error(
        `Orden ${orderId} pagada sin stock suficiente para: ${sinStock.join(', ')}. Revisar manualmente.`,
      );
    }

    return 'pagada';
  }

  if (RECHAZADOS.has(estadoMercadoPago)) {
    const resultado = await marcarFallida(orderId, paymentId);
    if (resultado === 'orden_desconocida') return avisarOrdenDesconocida(orderId, paymentId);
    return resultado === 'aplicada' ? 'fallida' : 'ya_procesada';
  }

  return 'sin_cambios';
}
