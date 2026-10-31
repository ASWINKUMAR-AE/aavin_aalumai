import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { validateBody } from '../../middleware/validate.js';
import { authRateLimiter } from '../../middleware/rateLimit.js';
import { loginSchema, registerSchema, refreshTokenSchema, forgotPasswordSchema } from './auth.validation.js';

const router = Router();

router.post('/login', authRateLimiter, validateBody(loginSchema), AuthController.login);
router.post('/register', authRateLimiter, validateBody(registerSchema), AuthController.register);
router.post('/refresh', validateBody(refreshTokenSchema), AuthController.refresh);
router.post('/forgot-password', authRateLimiter, validateBody(forgotPasswordSchema), AuthController.forgotPassword);
router.post('/logout', authenticate, AuthController.logout);
router.get('/me', authenticate, AuthController.getMe);

export default router;
