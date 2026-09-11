import { Router } from 'express';
import { authRouter } from './auth';
import { ordenesRouter } from './ordenes';
import { mercadopagoWebhookRouter } from './webhooks/mercadopago';
import { productosRouter } from './productos';

/**
 * Router raíz de la API. Cada épica siguiente cuelga su módulo acá
 * (materiales, producciones).
 */
export const apiRouter: Router = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/productos', productosRouter);
apiRouter.use('/ordenes', ordenesRouter);
apiRouter.use('/webhooks/mercadopago', mercadopagoWebhookRouter);
