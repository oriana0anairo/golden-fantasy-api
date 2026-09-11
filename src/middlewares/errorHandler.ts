import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { isProduction } from '../config';
import { HttpError } from '../lib';

/**
 * Violación de llave foránea de Prisma (P2003). En la práctica significa que
 * el pedido apunta a un comprador o producto que ya no existe — por ejemplo,
 * un token todavía vigente de una cuenta borrada.
 */
function isForeignKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && err.code === 'P2003';
}

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
    const cuerpo = { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) };
    res.status(err.status).json({ error: cuerpo });
    return;
  }

  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({ campo: issue.path.join('.'), mensaje: issue.message }));
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos', details } });
    return;
  }

  if (isForeignKeyError(err)) {
    res.status(409).json({
      error: {
        code: 'REFERENCIA_INEXISTENTE',
        message: 'La petición apunta a un registro que ya no existe. Vuelve a iniciar sesión e inténtalo de nuevo.',
      },
    });
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
