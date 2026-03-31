import { Request, Response, NextFunction } from 'express';
import * as followsService from './follows.service';
import type { AuthenticatedRequest } from '../../shared/middleware/authenticate';

export async function follow(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req as AuthenticatedRequest;
    await followsService.follow(userId, String(req.params.username));
    res.status(201).json({ message: 'Followed successfully' });
  } catch (err) {
    next(err);
  }
}

export async function unfollow(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req as AuthenticatedRequest;
    await followsService.unfollow(userId, String(req.params.username));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function getFeed(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req as AuthenticatedRequest;
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const result = await followsService.getFeed(userId, page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
