import { Router } from 'express';
import { getAdvertisements, updateAdvertisement } from '../controllers/advertisement.controller';
import { protect } from '../middleware/auth.middleware';
import { adminOnly } from '../middleware/role.middleware';

const router = Router();

router.get('/', getAdvertisements);
router.put('/:position', protect, adminOnly, updateAdvertisement);

export default router;
