import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { isProduction } from '../config';
import { HttpError } from '../lib';

function isBodyParseError(err: unknown): boolean {
  return err instanceof SyntaxError && 'type' in err && err.type === 'entity.parse.failed';
}

/** 404 para cualquier ruta no registrada. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Ruta no encontrada: ${req.method} ${req.path}` } });
}

/**
 * Traduce cualquier error a una respuesta JSON uniforme:
 * `{ error: { code, message, details? } }`
 */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }

  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({ campo: issue.path.join('.'), mensaje: issue.message }));
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos', details } });
    return;
  }

  // Body inválido: `express.json()` lanza un SyntaxError etiquetado.
  if (isBodyParseError(err)) {
    res.status(400).json({ error: { code: 'INVALID_JSON', message: 'El cuerpo de la petición no es JSON válido' } });
    return;
  }

  if (err instanceof Error && err.message.startsWith('Origen no permitido por CORS')) {
    res.status(403).json({ error: { code: 'CORS_ORIGIN_NOT_ALLOWED', message: err.message } });
    return;
  }

  console.error('Error no controlado:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: isProduction ? 'Error interno del servidor' : String(err instanceof Error ? err.message : err),
    },
  });
}
