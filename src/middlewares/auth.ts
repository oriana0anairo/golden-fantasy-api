import type { Role } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { HttpError, verifyToken } from '../lib';

function extractBearerToken(header: string | undefined): string | null {
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

/**
 * Verifica el JWT del header `Authorization` y expone `req.auth`
 * ({ userId, role }) para las rutas protegidas.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req.header('authorization'));

  if (!token) {
    next(HttpError.unauthorized('Falta el token de autenticación', 'MISSING_TOKEN'));
    return;
  }

  try {
    req.auth = verifyToken(token);
    next();
  } catch {
    next(HttpError.unauthorized('Token inválido o expirado', 'INVALID_TOKEN'));
  }
}

/**
 * Restringe una ruta a ciertos roles. Se usa después de `requireAuth`:
 * `router.get('/reportes', requireAuth, requireRole('ADMIN_OWNER'), handler)`
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(HttpError.unauthorized('Falta el token de autenticación', 'MISSING_TOKEN'));
      return;
    }

    if (!roles.includes(req.auth.role)) {
      next(HttpError.forbidden('No tienes permisos para este recurso', 'FORBIDDEN_ROLE'));
      return;
    }

    next();
  };
}
