import { Request, Response, NextFunction } from 'express';
import * as reviewsService from './reviews.service';
import type { AuthenticatedRequest } from '../../shared/middleware/authenticate';

export async function getAlbumReviews(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await reviewsService.getAlbumReviews(String(req.params.albumSlug), req.query as any);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function createReview(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req as AuthenticatedRequest;
    const review = await reviewsService.createReview(userId, req.body);
    res.status(201).json(review);
  } catch (err) {
    next(err);
  }
}

export async function updateReview(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req as AuthenticatedRequest;
    const review = await reviewsService.updateReview(String(req.params.reviewId), userId, req.body);
    res.json(review);
  } catch (err) {
    next(err);
  }
}

export async function deleteReview(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req as AuthenticatedRequest;
    await reviewsService.deleteReview(String(req.params.reviewId), userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
