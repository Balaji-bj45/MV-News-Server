import { Router } from 'express';
import { register, login, refresh, logout } from '../controllers/auth.controller';
import { protect } from '../middleware/auth.middleware';
import { adminOnly } from '../middleware/role.middleware';
import { body } from 'express-validator';

const router = Router();

router.post(
  '/register',
  protect,
  adminOnly,
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  login
);

router.post('/refresh', [body('refreshToken').notEmpty().withMessage('Refresh token is required')], refresh);

router.post('/logout', logout);

export default router;
