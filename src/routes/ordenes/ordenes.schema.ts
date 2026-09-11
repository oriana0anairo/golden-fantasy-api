import { z } from 'zod';

/** Tope duro de unidades por producto en el carrito (C7). */
export const MAX_UNIDADES_POR_PRODUCTO = 5;

const itemSchema = z.object({
  productId: z.uuid('Identificador de producto inválido'),
  quantity: z.coerce
    .number()
    .int('La cantidad debe ser un número entero')
    .min(1, 'La cantidad mínima es 1')
    .max(MAX_UNIDADES_POR_PRODUCTO, `El máximo por producto es ${MAX_UNIDADES_POR_PRODUCTO}`),
});

const textoRequerido = (campo: string, max = 200) =>
  z.string().trim().min(1, `${campo} es obligatorio`).max(max);

export const crearOrdenSchema = z.object({
  items: z.array(itemSchema).min(1, 'El pedido no tiene productos'),
  shipping: z.object({
    name: textoRequerido('El nombre'),
    address: textoRequerido('La dirección', 300),
    city: textoRequerido('La ciudad', 120),
    phone: textoRequerido('El teléfono', 40),
  }),
});

export type CrearOrdenDTO = z.infer<typeof crearOrdenSchema>;
export type ItemPedido = z.infer<typeof itemSchema>;
