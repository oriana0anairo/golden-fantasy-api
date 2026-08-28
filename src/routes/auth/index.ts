import { Router } from 'express';
import { requireAuth } from '../../middlewares';
import { login, registerBuyer } from './auth.service';
import { loginSchema, registerSchema } from './auth.schema';

/** Rutas de auth: validan el input, llaman al servicio y responden. */
export const authRouter: Router = Router();

authRouter.post('/register', async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    res.status(201).json(await registerBuyer(input));
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    res.status(200).json(await login(input));
  } catch (error) {
    next(error);
  }
});

/** Comprobación rápida de que un token sigue siendo válido. */
authRouter.get('/me', requireAuth, (req, res) => {
  res.status(200).json({ userId: req.auth?.userId, role: req.auth?.role });
});
