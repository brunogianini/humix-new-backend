import { Router } from 'express';
import { authenticate } from '../../shared/middleware/authenticate';
import * as recommendationsController from './recommendations.controller';

const router = Router();

router.get('/', authenticate, recommendationsController.getRecommendations as never);

export default router;
