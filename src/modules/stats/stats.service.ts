import { prisma } from '../../database/prisma';

export async function getTopArtists(limit = 10) {
  const result = await prisma.review.groupBy({
    by: ['albumId'],
    _count: { albumId: true },
    _avg: { rating: true },
    orderBy: { _count: { albumId: 'desc' } },
    take: limit * 3,
  });

  const albumIds = result.map((r) => r.albumId);
  const albums = await prisma.album.findMany({
    where: { id: { in: albumIds } },
    select: { id: true, artistId: true },
  });

  const artistCounts = new Map<string, { count: number; totalRating: number; ratingCount: number }>();
  for (const r of result) {
    const album = albums.find((a) => a.id === r.albumId);
    if (!album) continue;
    const current = artistCounts.get(album.artistId) ?? { count: 0, totalRating: 0, ratingCount: 0 };
    current.count += r._count.albumId;
    current.totalRating += (r._avg.rating ?? 0) * r._count.albumId;
    current.ratingCount += r._count.albumId;
    artistCounts.set(album.artistId, current);
  }

  const sortedArtistIds = [...artistCounts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([id]) => id);

  const artists = await prisma.artist.findMany({
    where: { id: { in: sortedArtistIds } },
    select: {
      id: true,
      name: true,
      slug: true,
      imageUrl: true,
      genres: { select: { genre: { select: { name: true, slug: true } } } },
    },
  });

  return artists.map((artist) => {
    const stats = artistCounts.get(artist.id)!;
    return {
      ...artist,
      genres: artist.genres.map((g) => g.genre),
      reviewCount: stats.count,
      avgRating: stats.ratingCount > 0 ? stats.totalRating / stats.ratingCount : 0,
    };
  });
}

export async function getTopAlbums(limit = 10) {
  const result = await prisma.review.groupBy({
    by: ['albumId'],
    _avg: { rating: true },
    _count: { albumId: true },
    having: { albumId: { _count: { gte: 1 } } },
    orderBy: [{ _avg: { rating: 'desc' } }, { _count: { albumId: 'desc' } }],
    take: limit,
  });

  const albumIds = result.map((r) => r.albumId);
  const albums = await prisma.album.findMany({
    where: { id: { in: albumIds } },
    select: {
      id: true,
      title: true,
      slug: true,
      coverUrl: true,
      releaseYear: true,
      artist: { select: { name: true, slug: true } },
    },
  });

  return albums.map((album) => {
    const stats = result.find((r) => r.albumId === album.id);
    return {
      ...album,
      avgRating: stats?._avg.rating ?? 0,
      reviewCount: stats?._count.albumId ?? 0,
    };
  });
}

export async function getTopGenres(limit = 10) {
  const genreStats = await prisma.albumGenre.groupBy({
    by: ['genreId'],
    _count: { genreId: true },
    orderBy: { _count: { genreId: 'desc' } },
    take: limit,
  });

  const genreIds = genreStats.map((g) => g.genreId);
  const genres = await prisma.genre.findMany({
    where: { id: { in: genreIds } },
    select: { id: true, name: true, slug: true },
  });

  return genres.map((genre) => {
    const stats = genreStats.find((g) => g.genreId === genre.id);
    return { ...genre, albumCount: stats?._count.genreId ?? 0 };
  });
}

export async function getUserStats(username: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (!user) return null;

  const [reviews, totalListened, streaks] = await Promise.all([
    prisma.review.aggregate({
      where: { userId: user.id },
      _avg: { rating: true },
      _count: { id: true },
    }),
    prisma.userAlbum.count({
      where: { userId: user.id, status: 'LISTENED' },
    }),
    prisma.streak.findMany({
      where: { userId: user.id },
      orderBy: { date: 'asc' },
      select: { date: true },
    }),
  ]);

  const currentStreak = calculateCurrentStreak(streaks.map((s) => s.date));
  const longestStreak = calculateLongestStreak(streaks.map((s) => s.date));

  const topGenres = await prisma.albumGenre.groupBy({
    by: ['genreId'],
    where: {
      album: { reviews: { some: { userId: user.id } } },
    },
    _count: { genreId: true },
    orderBy: { _count: { genreId: 'desc' } },
    take: 5,
  });

  const genreIds = topGenres.map((g) => g.genreId);
  const genres = await prisma.genre.findMany({
    where: { id: { in: genreIds } },
    select: { id: true, name: true, slug: true },
  });

  return {
    reviewCount: reviews._count.id,
    avgRating: reviews._avg.rating,
    totalListened,
    currentStreak,
    longestStreak,
    topGenres: genres.map((g) => ({
      ...g,
      count: topGenres.find((tg) => tg.genreId === g.id)?._count.genreId ?? 0,
    })),
  };
}

function calculateCurrentStreak(dates: Date[]): number {
  if (!dates.length) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sorted = [...dates].sort((a, b) => b.getTime() - a.getTime());
  const msPerDay = 86400000;

  let streak = 0;
  let expected = today.getTime();

  for (const date of sorted) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === expected || d.getTime() === expected - msPerDay) {
      streak++;
      expected = d.getTime() - msPerDay;
    } else {
      break;
    }
  }

  return streak;
}

function calculateLongestStreak(dates: Date[]): number {
  if (!dates.length) return 0;
  const msPerDay = 86400000;
  const sorted = [...dates]
    .map((d) => { const dt = new Date(d); dt.setHours(0, 0, 0, 0); return dt.getTime(); })
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => a - b);

  let maxStreak = 1;
  let current = 1;

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] === msPerDay) {
      current++;
      maxStreak = Math.max(maxStreak, current);
    } else {
      current = 1;
    }
  }

  return maxStreak;
}
