import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../../../../config';

/**
 * Valida el header `x-signature` de Mercado Pago (HMAC-SHA256 sobre
 * id + request-id + ts). Solo se aplica si hay `MERCADOPAGO_WEBHOOK_SECRET`
 * configurado; sin secreto se deja pasar, porque el estado del pago igual
 * se confirma consultando la API (esa es la verificación que manda).
 */
export interface DatosFirma {
  signature: string | undefined;
  requestId: string | undefined;
  dataId: string | undefined;
}

function parseSignature(signature: string): { ts?: string; v1?: string } {
  const partes = Object.fromEntries(
    signature.split(',').map((parte) => parte.split('=').map((t) => t.trim())),
  ) as Record<string, string | undefined>;

  return { ts: partes.ts, v1: partes.v1 };
}

export function firmaValida({ signature, requestId, dataId }: DatosFirma): boolean {
  if (!env.MERCADOPAGO_WEBHOOK_SECRET) return true;
  if (!signature || !dataId) return false;

  const { ts, v1 } = parseSignature(signature);
  if (!ts || !v1) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId ?? ''};ts:${ts};`;
  const esperado = createHmac('sha256', env.MERCADOPAGO_WEBHOOK_SECRET).update(manifest).digest('hex');

  const recibido = Buffer.from(v1, 'hex');
  const calculado = Buffer.from(esperado, 'hex');

  return recibido.length === calculado.length && timingSafeEqual(recibido, calculado);
}
