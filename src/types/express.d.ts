import type { TokenPayload } from '../lib/jwt';

/**
 * Extiende `Request` con el usuario autenticado que inyecta el
 * middleware de auth, para que las rutas lo lean con tipos.
 */
declare global {
  namespace Express {
    interface Request {
      auth?: TokenPayload;
    }
  }
}

export {};
