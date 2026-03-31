import { z } from 'zod';

export const createAlbumSchema = z.object({
  title: z.string().min(1).max(200),
  artist: z.string().min(1).max(200),
});

export const updateAlbumSchema = z.object({
  description: z.string().max(2000).optional(),
  coverUrl: z.string().url().optional(),
}).partial();

export const albumQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  genre: z.string().optional(),
  artistId: z.string().optional(),
  year: z.coerce.number().int().optional(),
  sort: z.enum(['title', 'releaseYear', 'rating', 'createdAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const userAlbumSchema = z.object({
  status: z.enum(['WANT_TO_LISTEN', 'LISTENING', 'LISTENED']),
});

export const importAlbumSchema = z.object({
  spotifyId: z.string().min(1),
});

export type CreateAlbumInput = z.infer<typeof createAlbumSchema>;
export type UpdateAlbumInput = z.infer<typeof updateAlbumSchema>;

export type AlbumQueryInput = z.infer<typeof albumQuerySchema>;
export type UserAlbumInput = z.infer<typeof userAlbumSchema>;
export type ImportAlbumInput = z.infer<typeof importAlbumSchema>;
