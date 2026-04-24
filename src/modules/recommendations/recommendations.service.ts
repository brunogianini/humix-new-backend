import { prisma } from '../../database/prisma';
import * as spotifyService from '../../shared/services/spotify';
import type { SpotifyAlbumSimple } from '../../shared/services/spotify';

export interface RecommendationResult {
  source: 'database' | 'spotify';
  album: {
    title: string;
    coverUrl: string | null;
    releaseYear: number | null;
    artist: {
      name: string;
      // database
      id?: string;
      slug?: string;
      imageUrl?: string | null;
      // spotify
      spotifyId?: string;
    };
    genres: { name: string; slug?: string }[];
    avgRating: number;
    reviewCount: number;
    // database
    id?: string;
    slug?: string;
    // spotify
    spotifyId?: string;
  };
  score: number;
  influencedBy: {
    album: {
      id: string;
      title: string;
      slug: string;
      coverUrl: string | null;
      releaseYear: number | null;
      artist: { name: string; slug: string };
    };
    rating: number;
    matchingGenres: string[];
  };
}

type UserReview = {
  rating: number;
  album: {
    id: string;
    title: string;
    slug: string;
    coverUrl: string | null;
    releaseYear: number | null;
    artistId: string;
    artist: { id: string; name: string; slug: string; imageUrl: string | null; spotifyId: string | null };
    genres: { genre: { id: string; name: string; slug: string } }[];
  };
};

type SpotifyCandidate = {
  album: SpotifyAlbumSimple;
  score: number;
  searchType: 'artist' | 'genre';
  artistDbId?: string;
  genreId?: string;
};

type ArtistSearchResult = { artistDbId: string; albums: SpotifyAlbumSimple[] };
type GenreSearchResult = { genreId: string; albums: SpotifyAlbumSimple[] };

const TOP_N = 3;

export async function getRecommendations(userId: string, limit = 10): Promise<RecommendationResult[]> {
  // 1. Fetch user reviews including artist spotifyId
  const userReviews: UserReview[] = await prisma.review.findMany({
    where: { userId },
    select: {
      rating: true,
      album: {
        select: {
          id: true,
          title: true,
          slug: true,
          coverUrl: true,
          releaseYear: true,
          artistId: true,
          artist: { select: { id: true, name: true, slug: true, imageUrl: true, spotifyId: true } },
          genres: { select: { genre: { select: { id: true, name: true, slug: true } } } },
        },
      },
    },
  });

  if (!userReviews.length) return [];

  // 2. Build preference maps
  const genreWeights = new Map<string, { weight: number; name: string; slug: string }>();
  const artistScores = new Map<string, { maxRating: number; spotifyId: string | null; name: string }>();

  for (const review of userReviews) {
    for (const g of review.album.genres) {
      const existing = genreWeights.get(g.genre.id);
      genreWeights.set(g.genre.id, {
        weight: (existing?.weight ?? 0) + review.rating,
        name: g.genre.name,
        slug: g.genre.slug,
      });
    }
    const existing = artistScores.get(review.album.artistId);
    if (!existing || review.rating > existing.maxRating) {
      artistScores.set(review.album.artistId, {
        maxRating: review.rating,
        spotifyId: review.album.artist.spotifyId,
        name: review.album.artist.name,
      });
    }
  }

  const genreIds = [...genreWeights.keys()];
  const artistIds = [...artistScores.keys()];
  if (!genreIds.length && !artistIds.length) return [];

  // 3. Albums user already interacted with
  const userAlbums = await prisma.userAlbum.findMany({
    where: { userId },
    select: { albumId: true },
  });
  const interactedDbIds = new Set([
    ...userReviews.map((r) => r.album.id),
    ...userAlbums.map((ua) => ua.albumId),
  ]);

  // 4. Top artists/genres for Spotify searches
  const topArtists = [...artistScores.entries()]
    .sort((a, b) => b[1].maxRating - a[1].maxRating)
    .slice(0, TOP_N);

  const topGenres = [...genreWeights.entries()]
    .sort((a, b) => b[1].weight - a[1].weight)
    .slice(0, TOP_N);

  // 5. Parallel: DB candidates + Spotify searches
  const [dbResult, ...spotifySettled] = await Promise.allSettled([
    prisma.album.findMany({
      where: {
        ...(interactedDbIds.size > 0 && { id: { notIn: [...interactedDbIds] } }),
        OR: [
          ...(genreIds.length ? [{ genres: { some: { genreId: { in: genreIds } } } }] : []),
          ...(artistIds.length ? [{ artistId: { in: artistIds } }] : []),
        ],
      },
      select: {
        id: true,
        title: true,
        slug: true,
        coverUrl: true,
        releaseYear: true,
        spotifyId: true,
        artistId: true,
        artist: { select: { id: true, name: true, slug: true, imageUrl: true } },
        genres: { select: { genre: { select: { id: true, name: true, slug: true } } } },
        reviews: { select: { rating: true } },
      },
      take: 300,
    }),
    ...topArtists.map(([artistDbId, { spotifyId, name }]) =>
      (spotifyId
        ? spotifyService.getArtistAlbums(spotifyId)
        : spotifyService.searchAlbums(`artist:"${name}"`, 20)
      ).then(
        (albums): ArtistSearchResult => ({
          artistDbId,
          albums: albums.filter((a) => a.album_type === 'album').slice(0, 20),
        }),
      ),
    ),
    ...topGenres.map(([genreId, { name }]) =>
      spotifyService
        .searchAlbums(`genre:"${name}"`, 10)
        .then((albums): GenreSearchResult => ({ genreId, albums })),
    ),
  ]);

  // 6. Score DB candidates
  const dbCandidates = dbResult.status === 'fulfilled' ? dbResult.value : [];
  const dbRecommendations: RecommendationResult[] = [];

  for (const candidate of dbCandidates) {
    const candidateGenreIds = new Set(candidate.genres.map((g) => g.genre.id));
    let score = 0;

    for (const [gId, { weight }] of genreWeights) {
      if (candidateGenreIds.has(gId)) score += weight;
    }
    score += (artistScores.get(candidate.artistId)?.maxRating ?? 0) * 0.5;
    if (score <= 0) continue;

    let bestInfluenceScore = -1;
    let bestReview = userReviews[0];
    let bestMatchingGenres: string[] = [];

    for (const review of userReviews) {
      const sameArtist = review.album.artistId === candidate.artistId ? 1 : 0;
      const matching = review.album.genres
        .map((g) => g.genre)
        .filter((g) => candidateGenreIds.has(g.id));
      const influenceScore = review.rating * (matching.length + sameArtist * 2);
      if (influenceScore > bestInfluenceScore) {
        bestInfluenceScore = influenceScore;
        bestReview = review;
        bestMatchingGenres = matching.map((g) => g.name);
      }
    }

    const reviewCount = candidate.reviews.length;
    const avgRating = reviewCount
      ? candidate.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
      : 0;

    dbRecommendations.push({
      source: 'database',
      album: {
        id: candidate.id,
        slug: candidate.slug,
        spotifyId: candidate.spotifyId ?? undefined,
        title: candidate.title,
        coverUrl: candidate.coverUrl,
        releaseYear: candidate.releaseYear,
        artist: candidate.artist,
        genres: candidate.genres.map((g) => g.genre),
        avgRating: Math.round(avgRating * 100) / 100,
        reviewCount,
      },
      score: Math.round(score * 100) / 100,
      influencedBy: {
        album: {
          id: bestReview.album.id,
          title: bestReview.album.title,
          slug: bestReview.album.slug,
          coverUrl: bestReview.album.coverUrl,
          releaseYear: bestReview.album.releaseYear,
          artist: { name: bestReview.album.artist.name, slug: bestReview.album.artist.slug },
        },
        rating: bestReview.rating,
        matchingGenres: bestMatchingGenres,
      },
    });
  }

  // 7. Collect Spotify candidates, dedup by spotifyId keeping highest score
  const spotifyCandidates = new Map<string, SpotifyCandidate>();

  for (let i = 0; i < topArtists.length; i++) {
    const settled = spotifySettled[i];
    if (settled.status !== 'fulfilled') continue;
    const { artistDbId, albums } = settled.value as ArtistSearchResult;
    const score = (artistScores.get(artistDbId)?.maxRating ?? 0) * 2;
    for (const album of albums) {
      if (!spotifyCandidates.has(album.id)) {
        spotifyCandidates.set(album.id, { album, score, searchType: 'artist', artistDbId });
      }
    }
  }

  for (let i = 0; i < topGenres.length; i++) {
    const settled = spotifySettled[topArtists.length + i];
    if (settled.status !== 'fulfilled') continue;
    const { genreId, albums } = settled.value as GenreSearchResult;
    const score = genreWeights.get(genreId)?.weight ?? 0;
    for (const album of albums) {
      const existing = spotifyCandidates.get(album.id);
      if (!existing || score > existing.score) {
        spotifyCandidates.set(album.id, { album, score, searchType: 'genre', genreId });
      }
    }
  }

  // 8. Filter out Spotify albums already in our DB
  const allSpotifyIds = [...spotifyCandidates.keys()];
  const alreadyInDb = allSpotifyIds.length
    ? await prisma.album.findMany({
        where: { spotifyId: { in: allSpotifyIds } },
        select: { spotifyId: true },
      })
    : [];
  const inDbSpotifyIds = new Set(alreadyInDb.map((a) => a.spotifyId).filter(Boolean) as string[]);

  // 9. Build Spotify recommendations
  const spotifyRecommendations: RecommendationResult[] = [];

  for (const [spotifyId, candidate] of spotifyCandidates) {
    if (inDbSpotifyIds.has(spotifyId)) continue;
    if (candidate.score <= 0) continue;

    const { album } = candidate;
    const coverUrl = spotifyService.getBestImage(album.images);
    const releaseYear = spotifyService.parseReleaseYear(album.release_date);
    const spotifyArtistId = album.artists[0]?.id ?? '';
    const artistName = album.artists[0]?.name ?? '';

    let bestReview = userReviews[0];
    let matchingGenres: string[] = [];

    if (candidate.searchType === 'artist' && candidate.artistDbId) {
      const best = userReviews
        .filter((r) => r.album.artistId === candidate.artistDbId)
        .sort((a, b) => b.rating - a.rating)[0];
      if (best) bestReview = best;
    } else if (candidate.searchType === 'genre' && candidate.genreId) {
      let bestRating = -1;
      for (const review of userReviews) {
        const hasGenre = review.album.genres.some((g) => g.genre.id === candidate.genreId);
        if (hasGenre && review.rating > bestRating) {
          bestRating = review.rating;
          bestReview = review;
          matchingGenres = [genreWeights.get(candidate.genreId)?.name ?? ''];
        }
      }
    }

    spotifyRecommendations.push({
      source: 'spotify',
      album: {
        spotifyId,
        title: album.name,
        coverUrl,
        releaseYear,
        artist: { name: artistName, spotifyId: spotifyArtistId },
        genres: [],
        avgRating: 0,
        reviewCount: 0,
      },
      score: Math.round(candidate.score * 100) / 100,
      influencedBy: {
        album: {
          id: bestReview.album.id,
          title: bestReview.album.title,
          slug: bestReview.album.slug,
          coverUrl: bestReview.album.coverUrl,
          releaseYear: bestReview.album.releaseYear,
          artist: {
            name: bestReview.album.artist.name,
            slug: bestReview.album.artist.slug,
          },
        },
        rating: bestReview.rating,
        matchingGenres,
      },
    });
  }

  // 10. Combine, sort by score, return top limit
  return [...dbRecommendations, ...spotifyRecommendations]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
