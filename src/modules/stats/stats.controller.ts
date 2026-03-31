import { Request, Response, NextFunction } from 'express';
import * as statsService from './stats.service';

export async function getTopArtists(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const result = await statsService.getTopArtists(limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getTopAlbums(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const result = await statsService.getTopAlbums(limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getTopGenres(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const result = await statsService.getTopGenres(limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getUserStats(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await statsService.getUserStats(String(req.params.username));
    res.json(result);
  } catch (err) {
    next(err);
  }
}
