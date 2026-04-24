import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../shared/middleware/authenticate';
import * as recommendationsService from './recommendations.service';

export async function getRecommendations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { userId } = req;
    const limit = Math.min(Math.max(1, Number(req.query.limit) || 10), 50);
    const recommendations = await recommendationsService.getRecommendations(userId, limit);
    res.json({ recommendations });
  } catch (err) {
    next(err);
  }
}
