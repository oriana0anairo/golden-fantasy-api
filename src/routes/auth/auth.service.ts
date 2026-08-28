import { Role, type User } from '@prisma/client';
import { HttpError, hashPassword, signToken, verifyPassword } from '../../lib';
import { createUser, findUserByEmail } from './auth.data';
import type { LoginDTO, RegisterBuyerDTO } from './auth.schema';

/** Lo que devuelven register y login: el token y el usuario sin datos sensibles. */
export interface AuthResult {
  token: string;
  user: { id: string; name: string; email: string; role: Role };
}

function toAuthResult(user: User): AuthResult {
  return {
    token: signToken({ userId: user.id, role: user.role }),
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

/**
 * Registro público. Siempre crea rol BUYER: no hay registro de admin
 * en v1 — el `ADMIN_OWNER` se crea con el seed.
 */
export async function registerBuyer(input: RegisterBuyerDTO): Promise<AuthResult> {
  const existente = await findUserByEmail(input.email);

  if (existente) {
    throw HttpError.conflict('Ya existe una cuenta con ese correo', 'EMAIL_ALREADY_REGISTERED');
  }

  const user = await createUser({
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    role: Role.BUYER,
  });

  return toAuthResult(user);
}

/**
 * Login para cualquier rol (comprador y admin usan el mismo endpoint;
 * el frontend decide a dónde llevar a cada quien según `user.role`).
 */
export async function login(input: LoginDTO): Promise<AuthResult> {
  const user = await findUserByEmail(input.email);
  const credencialesInvalidas = HttpError.unauthorized(
    'Correo o contraseña incorrectos',
    'INVALID_CREDENTIALS',
  );

  if (!user) {
    throw credencialesInvalidas;
  }

  const passwordCorrecta = await verifyPassword(input.password, user.passwordHash);

  if (!passwordCorrecta) {
    throw credencialesInvalidas;
  }

  return toAuthResult(user);
}
