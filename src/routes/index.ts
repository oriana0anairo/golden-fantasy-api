import { Router } from 'express';
import { authRouter } from './auth';
import { productosRouter } from './productos';

/**
 * Router raíz de la API. Cada épica siguiente cuelga su módulo acá
 * (materiales, producciones, ordenes, webhooks).
 */
export const apiRouter: Router = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/productos', productosRouter);
