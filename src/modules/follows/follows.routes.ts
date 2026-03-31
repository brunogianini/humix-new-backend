import { Router } from 'express';
import { authenticate } from '../../shared/middleware/authenticate';
import * as followsController from './follows.controller';

const router = Router();

router.post('/:username/follow', authenticate, followsController.follow);
router.delete('/:username/follow', authenticate, followsController.unfollow);
router.get('/feed', authenticate, followsController.getFeed);

export default router;
