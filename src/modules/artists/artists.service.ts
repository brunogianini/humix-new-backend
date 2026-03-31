import { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { NotFoundError } from '../../shared/errors/AppError';
import { getPaginationParams, buildPaginatedResult, slugify } from '../../shared/utils/pagination';
import type { CreateArtistInput, UpdateArtistInput } from './artists.schemas';
import * as spotifyService from '../../shared/services/spotify';

export async function listArtists(query: {
  page: number;
  limit: number;
  search?: string;
  genre?: string;
}) {
  const { page, limit, search, genre } = query;
  const { skip, take } = getPaginationParams(page, limit);

  const where: Prisma.ArtistWhereInput = {
    ...(search && { name: { contains: search, mode: 'insensitive' } }),
    ...(genre && { genres: { some: { genre: { slug: genre } } } }),
  };

  const [artists, total] = await Promise.all([
    prisma.artist.findMany({
      where,
      skip,
      take,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        country: true,
        formedYear: true,
        genres: { select: { genre: { select: { id: true, name: true, slug: true } } } },
        _count: { select: { albums: true } },
      },
    }),
    prisma.artist.count({ where }),
  ]);

  return buildPaginatedResult(artists, total, page, limit);
}

export async function getArtist(slug: string) {
  const artist = await prisma.artist.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      bio: true,
      imageUrl: true,
      country: true,
      formedYear: true,
      dissolvedYear: true,
      spotifyId: true,
      createdAt: true,
      genres: { select: { genre: { select: { id: true, name: true, slug: true } } } },
      albums: {
        orderBy: { releaseYear: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          coverUrl: true,
          releaseYear: true,
          spotifyId: true,
          _count: { select: { reviews: true } },
        },
      },
      _count: { select: { albums: true } },
    },
  });

  if (!artist) throw new NotFoundError('Artist');

  const dbAlbums = artist.albums.map(({ spotifyId: _sid, ...a }) => ({
    ...a,
    inHumix: true as const,
  }));

  let allAlbums: Array<
    | (typeof dbAlbums)[number]
    | { inHumix: false; spotifyId: string; title: string; albumType: string; coverUrl: string | null; releaseYear: number | null; totalTracks: number }
  > = dbAlbums;

  if (artist.spotifyId) {
    try {
      const spotifyAlbums = await spotifyService.getArtistAlbums(artist.spotifyId);
      const importedIds = new Set(
        artist.albums.map((a) => a.spotifyId).filter((id): id is string => Boolean(id)),
      );

      const unimported = spotifyAlbums
        .filter((sa) => !importedIds.has(sa.id))
        .map((sa) => ({
          inHumix: false as const,
          spotifyId: sa.id,
          title: sa.name,
          albumType: sa.album_type,
          coverUrl: spotifyService.getBestImage(sa.images),
          releaseYear: spotifyService.parseReleaseYear(sa.release_date),
          totalTracks: sa.total_tracks,
        }));

      allAlbums = [...dbAlbums, ...unimported].sort(
        (a, b) => (b.releaseYear ?? 0) - (a.releaseYear ?? 0),
      );
    } catch {
      // Spotify indisponível — retorna só os álbuns do banco
    }
  }

  const { albums: _albums, genres: _genres, ...artistData } = artist;

  return {
    ...artistData,
    genres: artist.genres.map((g) => g.genre),
    albums: allAlbums,
  };
}

export async function createArtist(input: CreateArtistInput) {
  const { genreIds, ...data } = input;
  const slug = slugify(data.name);

  return prisma.artist.create({
    data: {
      ...data,
      slug,
      genres: genreIds ? { create: genreIds.map((id) => ({ genreId: id })) } : undefined,
    },
    select: { id: true, name: true, slug: true, country: true, formedYear: true },
  });
}

export async function updateArtist(slug: string, input: UpdateArtistInput) {
  const artist = await prisma.artist.findUnique({ where: { slug }, select: { id: true } });
  if (!artist) throw new NotFoundError('Artist');

  const { genreIds, ...data } = input;

  if (genreIds !== undefined) {
    await prisma.artistGenre.deleteMany({ where: { artistId: artist.id } });
  }

  return prisma.artist.update({
    where: { id: artist.id },
    data: {
      ...data,
      genres: genreIds ? { create: genreIds.map((id) => ({ genreId: id })) } : undefined,
    },
    select: { id: true, name: true, slug: true },
  });
}

export async function deleteArtist(slug: string) {
  const artist = await prisma.artist.findUnique({ where: { slug }, select: { id: true } });
  if (!artist) throw new NotFoundError('Artist');
  await prisma.artist.delete({ where: { id: artist.id } });
}
