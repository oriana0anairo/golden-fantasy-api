import { Router } from 'express';
import { HttpError } from '../../lib';
import { requireAuth } from '../../middlewares';
import { crearOrden } from './ordenes.service';
import { crearOrdenSchema } from './ordenes.schema';

/** Pedidos. Comprar exige sesión (C3), sin importar el rol. */
export const ordenesRouter: Router = Router();

ordenesRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const buyerId = req.auth?.userId;
    if (!buyerId) throw HttpError.unauthorized('Falta el token de autenticación', 'MISSING_TOKEN');

    const input = crearOrdenSchema.parse(req.body);
    res.status(201).json(await crearOrden(buyerId, input));
  } catch (error) {
    next(error);
  }
});
