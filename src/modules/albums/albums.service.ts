import { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { NotFoundError } from '../../shared/errors/AppError';
import { getPaginationParams, buildPaginatedResult, slugify } from '../../shared/utils/pagination';
import type { CreateAlbumInput, UpdateAlbumInput, AlbumQueryInput, UserAlbumInput, ImportAlbumInput } from './albums.schemas';
import * as spotifyService from '../../shared/services/spotify';

const albumSelect = {
  id: true,
  title: true,
  slug: true,
  coverUrl: true,
  releaseYear: true,
  releaseDate: true,
  totalTracks: true,
  description: true,
  createdAt: true,
  artist: { select: { id: true, name: true, slug: true, imageUrl: true } },
  genres: { select: { genre: { select: { id: true, name: true, slug: true } } } },
  _count: { select: { reviews: true, userAlbums: true } },
} satisfies Prisma.AlbumSelect;

export async function listAlbums(query: AlbumQueryInput) {
  const { page, limit, search, genre, artistId, year, sort, order } = query;
  const { skip, take } = getPaginationParams(page, limit);

  const where: Prisma.AlbumWhereInput = {
    ...(search && { title: { contains: search, mode: 'insensitive' } }),
    ...(artistId && { artistId }),
    ...(year && { releaseYear: year }),
    ...(genre && { genres: { some: { genre: { slug: genre } } } }),
  };

  const orderBy: Prisma.AlbumOrderByWithRelationInput =
    sort === 'rating'
      ? { reviews: { _count: 'desc' } }
      : { [sort]: order };

  const [albums, total] = await Promise.all([
    prisma.album.findMany({ where, skip, take, orderBy, select: albumSelect }),
    prisma.album.count({ where }),
  ]);

  return buildPaginatedResult(albums, total, page, limit);
}

export async function getAlbum(slug: string, userId?: string) {
  const album = await prisma.album.findUnique({
    where: { slug },
    select: {
      ...albumSelect,
      tracks: { orderBy: { number: 'asc' }, select: { id: true, title: true, number: true, duration: true } },
    },
  });

  if (!album) throw new NotFoundError('Album');

  let userAlbum = null;
  let userReview = null;
  if (userId) {
    [userAlbum, userReview] = await Promise.all([
      prisma.userAlbum.findUnique({ where: { userId_albumId: { userId, albumId: album.id } } }),
      prisma.review.findUnique({
        where: { userId_albumId: { userId, albumId: album.id } },
        select: { id: true, rating: true, content: true, createdAt: true },
      }),
    ]);
  }

  const stats = await prisma.review.aggregate({
    where: { albumId: album.id },
    _avg: { rating: true },
    _count: { rating: true },
  });

  return {
    ...album,
    genres: album.genres.map((g) => g.genre),
    stats: { avgRating: stats._avg.rating, reviewCount: stats._count.rating },
    userAlbum,
    userReview,
  };
}

export async function createAlbum(input: CreateAlbumInput) {
  const query = `album:${input.title} artist:${input.artist}`;
  const results = await spotifyService.searchAlbums(query, 1);

  if (!results.length) {
    throw new NotFoundError(`No album found on Spotify for "${input.title}" by "${input.artist}"`);
  }

  return importFromSpotify({ spotifyId: results[0].id });
}

export async function updateAlbum(slug: string, input: UpdateAlbumInput) {
  const album = await prisma.album.findUnique({ where: { slug }, select: { id: true } });
  if (!album) throw new NotFoundError('Album');

  return prisma.album.update({
    where: { id: album.id },
    data: input,
    select: albumSelect,
  });
}

export async function deleteAlbum(slug: string) {
  const album = await prisma.album.findUnique({ where: { slug }, select: { id: true } });
  if (!album) throw new NotFoundError('Album');
  await prisma.album.delete({ where: { id: album.id } });
}

export async function setUserAlbum(userId: string, albumId: string, input: UserAlbumInput) {
  return prisma.userAlbum.upsert({
    where: { userId_albumId: { userId, albumId } },
    update: { status: input.status },
    create: { userId, albumId, status: input.status },
  });
}

export async function removeUserAlbum(userId: string, albumId: string) {
  await prisma.userAlbum.delete({ where: { userId_albumId: { userId, albumId } } });
}

export async function importFromSpotify(input: ImportAlbumInput) {
  // check if already imported
  const existing = await prisma.album.findUnique({
    where: { spotifyId: input.spotifyId },
    select: albumSelect,
  });
  if (existing) {
    return { ...existing, genres: existing.genres.map((g) => g.genre), alreadyExisted: true };
  }

  // fetch album + artist from Spotify
  const albumData = await spotifyService.getAlbum(input.spotifyId);
  const artistSpotifyId = albumData.artists[0]?.id;
  if (!artistSpotifyId) throw new Error('Album has no artist on Spotify');
  const artistData = await spotifyService.getArtist(artistSpotifyId);

  // find or create genres (from artist first, fallback to album)
  const genreNames: string[] = artistData.genres.length ? artistData.genres : albumData.genres;
  const genres = await Promise.all(
    genreNames.map(async (name) => {
      const slug = slugify(name);
      return prisma.genre.upsert({
        where: { slug },
        update: {},
        create: { name, slug },
        select: { id: true },
      });
    }),
  );

  // find or create artist
  let artist = await prisma.artist.findUnique({
    where: { spotifyId: artistSpotifyId },
    select: { id: true },
  });
  if (!artist) {
    const artistSlug = slugify(artistData.name);
    artist = await prisma.artist.upsert({
      where: { slug: artistSlug },
      update: { spotifyId: artistSpotifyId, imageUrl: spotifyService.getBestImage(artistData.images) },
      create: {
        name: artistData.name,
        slug: artistSlug,
        spotifyId: artistSpotifyId,
        imageUrl: spotifyService.getBestImage(artistData.images),
        genres: genres.length ? { create: genres.map((g) => ({ genreId: g.id })) } : undefined,
      },
      select: { id: true },
    });
  }

  // create album
  const releaseYear = spotifyService.parseReleaseYear(albumData.release_date);
  const releaseDate = spotifyService.parseReleaseDate(albumData.release_date, albumData.release_date_precision);
  const albumSlug = slugify(`${albumData.name}-${artist.id.slice(0, 6)}`);

  const album = await prisma.album.create({
    data: {
      title: albumData.name,
      slug: albumSlug,
      spotifyId: albumData.id,
      artistId: artist.id,
      releaseYear,
      releaseDate,
      coverUrl: spotifyService.getBestImage(albumData.images),
      totalTracks: albumData.total_tracks,
      genres: genres.length ? { create: genres.map((g) => ({ genreId: g.id })) } : undefined,
      tracks: {
        create: albumData.tracks.items.map((t) => ({
          title: t.name,
          number: t.track_number,
          duration: Math.round(t.duration_ms / 1000),
        })),
      },
    },
    select: albumSelect,
  });

  return { ...album, genres: album.genres.map((g) => g.genre), alreadyExisted: false };
}
