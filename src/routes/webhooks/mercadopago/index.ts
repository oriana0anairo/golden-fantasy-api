import { Router } from 'express';
import { extraerPaymentId, procesarNotificacion } from './webhook.service';
import { firmaValida } from './verificarFirma';

/**
 * Webhook público de Mercado Pago. No lleva JWT nuestro: se valida por firma
 * (si hay secreto configurado) y, sobre todo, consultando el pago real.
 *
 * Responde 200 en todos los casos de negocio —incluida una orden que no
 * existe— para que Mercado Pago no reintente por un problema nuestro. La
 * única excepción es un fallo al consultar su propia API: ahí sí conviene
 * que reintente, así que se devuelve 500 (ver `next(error)`).
 */
export const mercadopagoWebhookRouter: Router = Router();

mercadopagoWebhookRouter.post('/', async (req, res, next) => {
  const query = req.query as Record<string, unknown>;

  if (!firmaValida({
    signature: req.header('x-signature'),
    requestId: req.header('x-request-id'),
    dataId: String(query['data.id'] ?? (req.body as { data?: { id?: unknown } })?.data?.id ?? ''),
  })) {
    res.status(401).json({ error: { code: 'INVALID_SIGNATURE', message: 'Firma inválida' } });
    return;
  }

  const paymentId = extraerPaymentId(req.body, query);

  if (!paymentId) {
    res.status(200).json({ resultado: 'ignorado' });
    return;
  }

  try {
    res.status(200).json({ resultado: await procesarNotificacion(paymentId) });
  } catch (error) {
    next(error);
  }
});
