import { Router } from 'express';
import {
  createAdvertisement,
  deleteAdvertisement,
  getAdvertisements,
  updateAdvertisement,
} from '../controllers/advertisement.controller';
import { protect } from '../middleware/auth.middleware';
import { adminOnly } from '../middleware/role.middleware';

const router = Router();

router.get('/', getAdvertisements);
router.post('/', protect, adminOnly, createAdvertisement);
router.put('/:id', protect, adminOnly, updateAdvertisement);
router.delete('/:id', protect, adminOnly, deleteAdvertisement);

export default router;
