import { Role } from '@prisma/client';
import { z } from 'zod';
import { hashPassword, prisma, disconnectDb } from '../src/lib';

/**
 * Crea el usuario ADMIN_OWNER inicial. No hay registro público de admin:
 * esta es la única vía en v1. Las credenciales vienen por variables de
 * entorno, nunca hardcodeadas.
 *
 * Corre dentro del deploy, así que está pensado para repetirse sin daño:
 * - Sin variables ADMIN_OWNER_* configuradas -> no hace nada y sale bien.
 * - Si el admin ya existe -> no lo toca (no le pisa la contraseña en cada
 *   deploy), salvo que se pida con ADMIN_OWNER_RESET_PASSWORD=true.
 */
const adminEnvSchema = z.object({
  ADMIN_OWNER_NAME: z.string().trim().min(2).default('Admin Golden Fantasy'),
  ADMIN_OWNER_EMAIL: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email('ADMIN_OWNER_EMAIL debe ser un correo válido')),
  ADMIN_OWNER_PASSWORD: z.string().min(8, 'ADMIN_OWNER_PASSWORD debe tener al menos 8 caracteres'),
  ADMIN_OWNER_RESET_PASSWORD: z
    .string()
    .optional()
    .transform((valor) => valor?.toLowerCase() === 'true'),
});

/** Sin ninguna de las dos variables clave, el seed simplemente no aplica. */
function seedNoConfigurado(): boolean {
  return !process.env.ADMIN_OWNER_EMAIL && !process.env.ADMIN_OWNER_PASSWORD;
}

function leerConfig() {
  const parsed = adminEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const detalle = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Variables de entorno inválidas para el seed del admin:\n${detalle}`);
  }

  return parsed.data;
}

async function main(): Promise<void> {
  if (seedNoConfigurado()) {
    console.log('Seed omitido: no hay ADMIN_OWNER_EMAIL ni ADMIN_OWNER_PASSWORD configurados.');
    return;
  }

  const config = leerConfig();
  const email = config.ADMIN_OWNER_EMAIL;
  const existente = await prisma.user.findUnique({ where: { email } });

  if (existente && !config.ADMIN_OWNER_RESET_PASSWORD) {
    console.log(`El admin ${email} ya existe (${existente.role}), no se modifica.`);
    return;
  }

  const passwordHash = await hashPassword(config.ADMIN_OWNER_PASSWORD);
  const admin = await prisma.user.upsert({
    where: { email },
    update: { name: config.ADMIN_OWNER_NAME, passwordHash, role: Role.ADMIN_OWNER },
    create: {
      name: config.ADMIN_OWNER_NAME,
      email,
      passwordHash,
      role: Role.ADMIN_OWNER,
    },
  });

  const accion = existente ? 'contraseña restablecida' : 'creado';
  console.log(`Admin dueño ${accion}: ${admin.email} (${admin.role})`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => disconnectDb());
