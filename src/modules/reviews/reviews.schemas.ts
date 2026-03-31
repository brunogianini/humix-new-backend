import { z } from 'zod';

export const createReviewSchema = z.object({
  albumId: z.string().cuid(),
  rating: z.number().min(0.5).max(5).multipleOf(0.5),
  content: z.string().max(5000).optional(),
  listenedAt: z.string().datetime().optional(),
});

export const updateReviewSchema = z.object({
  rating: z.number().min(0.5).max(5).multipleOf(0.5).optional(),
  content: z.string().max(5000).optional(),
  listenedAt: z.string().datetime().optional(),
});

export const reviewQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  albumId: z.string().optional(),
  sort: z.enum(['createdAt', 'rating']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
