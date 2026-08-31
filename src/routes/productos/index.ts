import { Router } from 'express';
import { listProductsSchema, productIdSchema } from './productos.schema';
import { getProductById, listProducts } from './productos.service';

/** Rutas del catálogo público: sin auth, sin lógica de negocio acá. */
export const productosRouter: Router = Router();

productosRouter.get('/', async (req, res, next) => {
  try {
    const filters = listProductsSchema.parse(req.query);
    res.status(200).json(await listProducts(filters));
  } catch (error) {
    next(error);
  }
});

productosRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = productIdSchema.parse(req.params);
    res.status(200).json(await getProductById(id));
  } catch (error) {
    next(error);
  }
});
