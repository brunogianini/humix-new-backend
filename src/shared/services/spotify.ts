import { env } from '../../config/env';

// ── Types ─────────────────────────────────────────────────────────────────

export interface SpotifyImage {
  url: string;
  width: number | null;
  height: number | null;
}

export interface SpotifyArtistSimple {
  id: string;
  name: string;
}

export interface SpotifyArtistFull extends SpotifyArtistSimple {
  genres: string[];
  images: SpotifyImage[];
}

export interface SpotifyTrack {
  id: string;
  name: string;
  track_number: number;
  duration_ms: number;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  album_type: string;
  release_date: string;
  release_date_precision: 'year' | 'month' | 'day';
  total_tracks: number;
  images: SpotifyImage[];
  artists: SpotifyArtistSimple[];
  genres: string[];
  tracks: { items: SpotifyTrack[] };
}

export interface SpotifyAlbumSimple {
  id: string;
  name: string;
  album_type: string;
  release_date: string;
  release_date_precision: 'year' | 'month' | 'day';
  total_tracks: number;
  images: SpotifyImage[];
  artists: SpotifyArtistSimple[];
}

// ── Token cache ───────────────────────────────────────────────────────────

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }

  const credentials = Buffer.from(
    `${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`,
  ).toString('base64');

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    throw new Error(`Spotify auth failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

async function spotifyGet<T>(path: string): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    if (res.status === 404) throw Object.assign(new Error('Not found on Spotify'), { status: 404 });
    throw new Error(`Spotify API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

// ── Public API ────────────────────────────────────────────────────────────

export async function searchAlbums(
  query: string,
  limit = 10,
): Promise<SpotifyAlbumSimple[]> {
  const params = new URLSearchParams({ q: query, type: 'album', limit: String(limit) });
  const data = await spotifyGet<{ albums: { items: SpotifyAlbumSimple[] } }>(
    `/search?${params}`,
  );
  return data.albums.items;
}

export async function getAlbum(spotifyId: string): Promise<SpotifyAlbum> {
  return spotifyGet<SpotifyAlbum>(`/albums/${spotifyId}`);
}

export async function getArtist(spotifyId: string): Promise<SpotifyArtistFull> {
  return spotifyGet<SpotifyArtistFull>(`/artists/${spotifyId}`);
}

export async function getArtistAlbums(artistSpotifyId: string): Promise<SpotifyAlbumSimple[]> {
  const params = new URLSearchParams({ include_groups: 'album', limit: '50', market: 'US' });
  const data = await spotifyGet<{ items: SpotifyAlbumSimple[] }>(
    `/artists/${artistSpotifyId}/albums?${params}`,
  );
  return data.items;
}


export function parseReleaseYear(releaseDate: string): number | null {
  const year = parseInt(releaseDate.slice(0, 4), 10);
  return isNaN(year) ? null : year;
}

export function parseReleaseDate(
  releaseDate: string,
  precision: 'year' | 'month' | 'day',
): Date | null {
  if (precision === 'year') return null;
  const d = new Date(releaseDate);
  return isNaN(d.getTime()) ? null : d;
}

export function getBestImage(images: SpotifyImage[]): string | null {
  if (!images.length) return null;
  // prefer largest image
  return images.sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0].url;
}
