import { prisma } from '../../database/prisma';

export async function getTopArtists(limit = 10) {
  type ArtistRow = { id: string; name: string; slug: string; imageUrl: string | null; reviewCount: number; avgRating: number };
  const rows = await prisma.$queryRaw<ArtistRow[]>`
    SELECT
      a.id, a.name, a.slug, a."imageUrl",
      COUNT(r.id)::int AS "reviewCount",
      AVG(r.rating)::float AS "avgRating"
    FROM "Review" r
    JOIN "Album" al ON al.id = r."albumId"
    JOIN "Artist" a ON a.id = al."artistId"
    GROUP BY a.id, a.name, a.slug, a."imageUrl"
    ORDER BY "reviewCount" DESC
    LIMIT ${limit}
  `;

  if (!rows.length) return [];

  const artistIds = rows.map((r) => r.id);
  const genreRows = await prisma.artistGenre.findMany({
    where: { artistId: { in: artistIds } },
    select: { artistId: true, genre: { select: { name: true, slug: true } } },
  });

  const genresByArtist = new Map<string, { name: string; slug: string }[]>();
  for (const g of genreRows) {
    const list = genresByArtist.get(g.artistId) ?? [];
    list.push(g.genre);
    genresByArtist.set(g.artistId, list);
  }

  return rows.map((artist) => ({
    ...artist,
    genres: genresByArtist.get(artist.id) ?? [],
  }));
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

  type GenreRow = { id: string; name: string; slug: string; count: number };
  const topGenres = await prisma.$queryRaw<GenreRow[]>`
    SELECT g.id, g.name, g.slug, COUNT(*)::int AS count
    FROM "AlbumGenre" ag
    JOIN "Genre" g ON g.id = ag."genreId"
    WHERE ag."albumId" IN (
      SELECT "albumId" FROM "Review" WHERE "userId" = ${user.id}
    )
    GROUP BY g.id, g.name, g.slug
    ORDER BY count DESC
    LIMIT 5
  `;

  return {
    reviewCount: reviews._count.id,
    avgRating: reviews._avg.rating,
    totalListened,
    currentStreak,
    longestStreak,
    topGenres,
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
