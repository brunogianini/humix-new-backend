import { Request, Response, NextFunction } from 'express';
import * as streaksService from './streaks.service';
import type { AuthenticatedRequest } from '../../shared/middleware/authenticate';

export async function getUserStreaks(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await streaksService.getUserStreaks(String(req.params.username));
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function logStreak(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req as AuthenticatedRequest;
    const result = await streaksService.logStreak(userId, req.body.albumId);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}
