import { Role } from '@prisma/client';
import { z } from 'zod';
import { hashPassword, prisma, disconnectDb } from '../src/lib';

/**
 * Crea (o actualiza) el usuario ADMIN_OWNER inicial.
 * No hay registro público de admin: esta es la única vía en v1.
 * Las credenciales vienen por variables de entorno, nunca hardcodeadas.
 */
const adminEnvSchema = z.object({
  ADMIN_OWNER_NAME: z.string().trim().min(2).default('Admin Golden Fantasy'),
  ADMIN_OWNER_EMAIL: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email('ADMIN_OWNER_EMAIL debe ser un correo válido')),
  ADMIN_OWNER_PASSWORD: z.string().min(8, 'ADMIN_OWNER_PASSWORD debe tener al menos 8 caracteres'),
});

async function main(): Promise<void> {
  const parsed = adminEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const detalle = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Faltan variables de entorno para el seed del admin:\n${detalle}`);
  }

  const { ADMIN_OWNER_NAME, ADMIN_OWNER_EMAIL, ADMIN_OWNER_PASSWORD } = parsed.data;
  const passwordHash = await hashPassword(ADMIN_OWNER_PASSWORD);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_OWNER_EMAIL },
    update: { name: ADMIN_OWNER_NAME, passwordHash, role: Role.ADMIN_OWNER },
    create: {
      name: ADMIN_OWNER_NAME,
      email: ADMIN_OWNER_EMAIL,
      passwordHash,
      role: Role.ADMIN_OWNER,
    },
  });

  console.log(`Admin dueño listo: ${admin.email} (${admin.role})`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => disconnectDb());
