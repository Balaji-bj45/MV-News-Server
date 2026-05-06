import { Router } from 'express';
import { getCandidates, getCandidateById, createCandidate, updateCandidate, deleteCandidate } from '../controllers/candidate.controller';
import { protect } from '../middleware/auth.middleware';
import { adminOnly } from '../middleware/role.middleware';
import { body } from 'express-validator';

const router = Router();

router.get('/', getCandidates);
router.get('/:id', getCandidateById);

router.post(
  '/',
  protect,
  adminOnly,
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('nameInTamil').notEmpty().withMessage('Name in Tamil is required'),
    body('party').notEmpty().withMessage('Party is required'),
    body('constituency').notEmpty().withMessage('Constituency is required'),
  ],
  createCandidate
);

router.put('/:id', protect, adminOnly, updateCandidate);
router.delete('/:id', protect, adminOnly, deleteCandidate);

export default router;
