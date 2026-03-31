import { Request, Response, NextFunction } from 'express';
import * as usersService from './users.service';
import type { AuthenticatedRequest } from '../../shared/middleware/authenticate';

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const viewerId = (req as AuthenticatedRequest).userId;
    const profile = await usersService.getProfile(String(req.params.username), viewerId);
    res.json(profile);
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req as AuthenticatedRequest;
    const result = await usersService.updateProfile(userId, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getUserAlbums(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit } = req.query as any;
    const result = await usersService.getUserAlbums(String(req.params.username), Number(page), Number(limit));
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getUserReviews(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit } = req.query as any;
    const result = await usersService.getUserReviews(String(req.params.username), Number(page), Number(limit));
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getFollowers(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit } = req.query as any;
    const result = await usersService.getFollowers(String(req.params.username), Number(page), Number(limit));
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getFollowing(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit } = req.query as any;
    const result = await usersService.getFollowing(String(req.params.username), Number(page), Number(limit));
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function deleteAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req as AuthenticatedRequest;
    await usersService.deleteAccount(String(req.params.userId), userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
