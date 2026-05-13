import { Router } from 'express';
import { getNews, getNewsBySlug, createNews, updateNews, deleteNews, toggleFeatureNews } from '../controllers/news.controller';
import { protect } from '../middleware/auth.middleware';
import { adminOnly } from '../middleware/role.middleware';
import { body } from 'express-validator';

const router = Router();

router.get('/', getNews);
router.get('/:slug', getNewsBySlug);

router.post(
  '/',
  protect,
  adminOnly,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('category').isIn(['india', 'tamilnadu', 'candidate', 'mvnews']).withMessage('Invalid category'),
  ],
  createNews
);

router.put(
  '/:id',
  protect,
  adminOnly,
  [
    body('category').optional().isIn(['india', 'tamilnadu', 'candidate', 'mvnews']).withMessage('Invalid category'),
  ],
  updateNews
);

router.delete('/:id', protect, adminOnly, deleteNews);
router.patch('/:id/feature', protect, adminOnly, toggleFeatureNews);

export default router;
