import type { Role } from '@prisma/client';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config';

/** Contenido del JWT que consume el frontend y el middleware de auth. */
export interface TokenPayload {
  userId: string;
  role: Role;
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

  const { userId, role } = decoded as jwt.JwtPayload & Partial<TokenPayload>;

  if (typeof userId !== 'string' || typeof role !== 'string') {
    throw new Error('Token con formato inesperado');
  }

  return { userId, role };
}
