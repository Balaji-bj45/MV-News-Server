import { Router } from 'express';
import { getVideos, getVideoById, createVideo, updateVideo, deleteVideo } from '../controllers/video.controller';
import { protect } from '../middleware/auth.middleware';
import { adminOnly } from '../middleware/role.middleware';
import { body } from 'express-validator';

const router = Router();

router.get('/', getVideos);
router.get('/:id', getVideoById);

router.post(
  '/',
  protect,
  adminOnly,
  [
    body('youtubeId').notEmpty().withMessage('YouTube video URL or ID is required'),
    body('title').notEmpty().withMessage('Title is required'),
  ],
  createVideo
);

router.put('/:id', protect, adminOnly, updateVideo);
router.delete('/:id', protect, adminOnly, deleteVideo);

export default router;
