import { Router } from 'express';
import { authenticate } from '../../shared/middleware/authenticate';
import * as streaksController from './streaks.controller';

const router = Router();

router.get('/:username', streaksController.getUserStreaks);
router.post('/', authenticate, streaksController.logStreak);

export default router;
