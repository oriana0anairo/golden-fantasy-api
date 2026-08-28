import { z } from 'zod';

/**
 * El correo se normaliza (trim + minúsculas) ANTES de validarlo: si no,
 * "  Ana@Ejemplo.com " se rechazaría, y el mismo correo con distinta
 * capitalización crearía cuentas duplicadas.
 */
const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Correo electrónico inválido'));

/**
 * Validación de entrada de los endpoints de auth.
 * El registro público es solo para compradores: el rol no se recibe del
 * cliente, lo fija el servicio en BUYER (los admin se crean por seed).
 */
export const registerSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(120),
  email: emailSchema,
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(72),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export type RegisterBuyerDTO = z.infer<typeof registerSchema>;
export type LoginDTO = z.infer<typeof loginSchema>;
