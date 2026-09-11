import { env } from '../config';
import { HttpError } from './httpError';

/**
 * Cliente de Mercado Pago (Checkout Pro, API de Preferences).
 * Se usa `fetch` directo en vez del SDK: son dos llamadas, evita una
 * dependencia más, y `MERCADOPAGO_API_URL` permite apuntarlo a un doble
 * para probar el flujo completo sin tocar Mercado Pago.
 */

export interface PreferenceItem {
  id: string;
  title: string;
  quantity: number;
  unitPrice: number;
}

export interface CreatePreferenceInput {
  orderId: string;
  items: PreferenceItem[];
  backUrls: { success: string; failure: string; pending: string };
  notificationUrl: string;
}

export interface PreferenceCreated {
  id: string;
  initPoint: string;
}

/** Estado que devuelve Mercado Pago para un pago consultado. */
export interface PaymentStatus {
  id: string;
  status: string;
  externalReference: string | null;
}

function accessToken(): string {
  if (!env.MERCADOPAGO_ACCESS_TOKEN) {
    throw new HttpError(503, 'El pago no está configurado en el servidor', 'PAYMENTS_NOT_CONFIGURED');
  }
  return env.MERCADOPAGO_ACCESS_TOKEN;
}

async function mpFetch(path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(`${env.MERCADOPAGO_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    console.error('Mercado Pago respondió', response.status, JSON.stringify(payload));
    throw new HttpError(502, 'Mercado Pago rechazó la solicitud', 'MERCADOPAGO_ERROR');
  }

  return payload;
}

export async function createPreference(input: CreatePreferenceInput): Promise<PreferenceCreated> {
  const body = {
    items: input.items.map((item) => ({
      id: item.id,
      title: item.title,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      currency_id: 'COP',
    })),
    back_urls: input.backUrls,
    auto_return: 'approved',
    external_reference: input.orderId,
    notification_url: input.notificationUrl,
  };

  const payload = (await mpFetch('/checkout/preferences', {
    method: 'POST',
    body: JSON.stringify(body),
  })) as { id?: string; init_point?: string };

  if (!payload?.id || !payload.init_point) {
    throw new HttpError(502, 'Mercado Pago no devolvió la preferencia esperada', 'MERCADOPAGO_ERROR');
  }

  return { id: payload.id, initPoint: payload.init_point };
}

/** Consulta el estado real del pago: la notificación por sí sola no basta. */
export async function getPayment(paymentId: string): Promise<PaymentStatus> {
  const payload = (await mpFetch(`/v1/payments/${encodeURIComponent(paymentId)}`)) as {
    id?: number | string;
    status?: string;
    external_reference?: string | null;
  };

  return {
    id: String(payload?.id ?? paymentId),
    status: String(payload?.status ?? 'unknown'),
    externalReference: payload?.external_reference ?? null,
  };
}
