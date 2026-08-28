import type { Role, User } from '@prisma/client';
import { prisma } from '../../lib';

/** Acceso a datos de auth. Nadie más habla con Prisma para `User`. */

export function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } });
}

export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
}

export function createUser(input: CreateUserInput): Promise<User> {
  return prisma.user.create({ data: input });
}
