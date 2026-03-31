import { Request, Response, NextFunction } from 'express';
import * as albumsService from './albums.service';
import type { AuthenticatedRequest } from '../../shared/middleware/authenticate';

export async function listAlbums(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await albumsService.listAlbums(req.query as any);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getAlbum(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const album = await albumsService.getAlbum(String(req.params.slug), userId);
    res.json(album);
  } catch (err) {
    next(err);
  }
}

export async function createAlbum(req: Request, res: Response, next: NextFunction) {
  try {
    const album = await albumsService.createAlbum(req.body);
    res.status(album.alreadyExisted ? 200 : 201).json(album);
  } catch (err) {
    next(err);
  }
}

export async function updateAlbum(req: Request, res: Response, next: NextFunction) {
  try {
    const album = await albumsService.updateAlbum(String(req.params.slug), req.body);
    res.json(album);
  } catch (err) {
    next(err);
  }
}

export async function deleteAlbum(req: Request, res: Response, next: NextFunction) {
  try {
    await albumsService.deleteAlbum(String(req.params.slug));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function setUserAlbum(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req as AuthenticatedRequest;
    const result = await albumsService.setUserAlbum(userId, String(req.params.albumId), req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function removeUserAlbum(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req as AuthenticatedRequest;
    await albumsService.removeUserAlbum(userId, String(req.params.albumId));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function importAlbum(req: Request, res: Response, next: NextFunction) {
  try {
    const album = await albumsService.importFromSpotify(req.body);
    res.status(album.alreadyExisted ? 200 : 201).json(album);
  } catch (err) {
    next(err);
  }
}
