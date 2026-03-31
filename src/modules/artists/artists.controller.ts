import { Request, Response, NextFunction } from 'express';
import * as artistsService from './artists.service';

export async function listArtists(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await artistsService.listArtists(req.query as any);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getArtist(req: Request, res: Response, next: NextFunction) {
  try {
    const artist = await artistsService.getArtist(String(req.params.slug));
    res.json(artist);
  } catch (err) {
    next(err);
  }
}

export async function createArtist(req: Request, res: Response, next: NextFunction) {
  try {
    const artist = await artistsService.createArtist(req.body);
    res.status(201).json(artist);
  } catch (err) {
    next(err);
  }
}

export async function updateArtist(req: Request, res: Response, next: NextFunction) {
  try {
    const artist = await artistsService.updateArtist(String(req.params.slug), req.body);
    res.json(artist);
  } catch (err) {
    next(err);
  }
}

export async function deleteArtist(req: Request, res: Response, next: NextFunction) {
  try {
    await artistsService.deleteArtist(String(req.params.slug));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
