import { Role } from '@prisma/client';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config';

/** Contenido del JWT que consume el frontend y el middleware de auth. */
export interface TokenPayload {
  userId: string;
  role: Role;
}

const ROLES_VALIDOS: readonly string[] = Object.values(Role);

/**
 * El payload de un JWT es `any` para TypeScript (`JwtPayload` tiene índice
 * abierto), así que el rol se valida contra el enum real en runtime: un token
 * con un rol inventado se rechaza en vez de colarse hasta `requireRole`.
 */
function esRoleValido(valor: unknown): valor is Role {
  return typeof valor === 'string' && ROLES_VALIDOS.includes(valor);
}

export function signToken(payload: TokenPayload): string {
  const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

/** Devuelve el payload si el token es válido; lanza si está vencido o alterado. */
export function verifyToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);

  if (typeof decoded === 'string') {
    throw new Error('Token con formato inesperado');
  }

  const userId: unknown = decoded.userId;
  const role: unknown = decoded.role;

  if (typeof userId !== 'string' || !esRoleValido(role)) {
    throw new Error('Token con formato inesperado');
  }

  return { userId, role };
}
