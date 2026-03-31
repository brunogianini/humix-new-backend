import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../database/prisma';
import * as spotifyService from '../../shared/services/spotify';

export async function searchAlbums(req: Request, res: Response, next: NextFunction) {
  try {
    const q = String(req.query.q ?? '').trim();
    const limit = Math.min(20, Math.max(1, Number(req.query.limit ?? 10)));

    if (!q) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Query param "q" is required' } });
      return;
    }

    const spotifyResults = await spotifyService.searchAlbums(q, limit);

    // check which ones are already imported
    const spotifyIds = spotifyResults.map((a) => a.id);
    const imported = await prisma.album.findMany({
      where: { spotifyId: { in: spotifyIds } },
      select: { spotifyId: true, slug: true },
    });
    const importedMap = new Map(imported.map((a) => [a.spotifyId, a.slug]));

    const results = spotifyResults.map((album) => ({
      spotifyId: album.id,
      title: album.name,
      albumType: album.album_type,
      artist: {
        spotifyId: album.artists[0]?.id ?? null,
        name: album.artists[0]?.name ?? 'Unknown',
      },
      releaseYear: spotifyService.parseReleaseYear(album.release_date),
      coverUrl: spotifyService.getBestImage(album.images),
      totalTracks: album.total_tracks,
      alreadyImported: importedMap.has(album.id),
      importedSlug: importedMap.get(album.id) ?? null,
    }));

    res.json({ data: results });
  } catch (err) {
    next(err);
  }
}
