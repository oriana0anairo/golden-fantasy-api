/**
 * Error de negocio con código HTTP. Los servicios lanzan esto y el
 * middleware de errores lo traduce a una respuesta JSON.
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code: string,
    /** Detalle opcional, ej. qué ítem del pedido falló y por qué. */
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }

  static badRequest(message: string, code = 'BAD_REQUEST', details?: unknown): HttpError {
    return new HttpError(400, message, code, details);
  }

  static unauthorized(message: string, code = 'UNAUTHORIZED'): HttpError {
    return new HttpError(401, message, code);
  }

  static forbidden(message: string, code = 'FORBIDDEN'): HttpError {
    return new HttpError(403, message, code);
  }

  static notFound(message: string, code = 'NOT_FOUND'): HttpError {
    return new HttpError(404, message, code);
  }

  static conflict(message: string, code = 'CONFLICT'): HttpError {
    return new HttpError(409, message, code);
  }
}
