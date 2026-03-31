import { z } from 'zod';

export const createArtistSchema = z.object({
  name: z.string().min(1).max(200),
  bio: z.string().max(2000).optional(),
  imageUrl: z.string().url().optional(),
  country: z.string().max(100).optional(),
  formedYear: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
  dissolvedYear: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
  genreIds: z.array(z.string().cuid()).optional(),
});

export const updateArtistSchema = createArtistSchema.partial();

export const artistQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  genre: z.string().optional(),
});

export type CreateArtistInput = z.infer<typeof createArtistSchema>;
export type UpdateArtistInput = z.infer<typeof updateArtistSchema>;
