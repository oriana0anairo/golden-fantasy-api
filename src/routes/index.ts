import { Router } from 'express';
import { authRouter } from './auth';

/**
 * Router raíz de la API. Cada épica siguiente cuelga su módulo acá
 * (productos, materiales, producciones, ordenes, webhooks).
 */
export const apiRouter: Router = Router();

apiRouter.use('/auth', authRouter);
