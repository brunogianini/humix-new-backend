import { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { NotFoundError, ForbiddenError, ConflictError } from '../../shared/errors/AppError';
import { getPaginationParams, buildPaginatedResult } from '../../shared/utils/pagination';
import type { CreateReviewInput, UpdateReviewInput } from './reviews.schemas';

const reviewSelect = {
  id: true,
  rating: true,
  content: true,
  listenedAt: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
  album: {
    select: {
      id: true,
      title: true,
      slug: true,
      coverUrl: true,
      artist: { select: { name: true, slug: true } },
    },
  },
} satisfies Prisma.ReviewSelect;

export async function getAlbumReviews(
  albumSlug: string,
  query: { page: number; limit: number; sort: string; order: string },
) {
  const album = await prisma.album.findUnique({ where: { slug: albumSlug }, select: { id: true } });
  if (!album) throw new NotFoundError('Album');

  const { skip, take } = getPaginationParams(query.page, query.limit);
  const orderBy = { [query.sort]: query.order } as Prisma.ReviewOrderByWithRelationInput;

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: { albumId: album.id },
      skip,
      take,
      orderBy,
      select: reviewSelect,
    }),
    prisma.review.count({ where: { albumId: album.id } }),
  ]);

  return buildPaginatedResult(reviews, total, query.page, query.limit);
}

export async function createReview(userId: string, input: CreateReviewInput) {
  const album = await prisma.album.findUnique({ where: { id: input.albumId }, select: { id: true } });
  if (!album) throw new NotFoundError('Album');

  const existing = await prisma.review.findUnique({
    where: { userId_albumId: { userId, albumId: input.albumId } },
  });
  if (existing) throw new ConflictError('You have already reviewed this album');

  const review = await prisma.review.create({
    data: {
      userId,
      albumId: input.albumId,
      rating: input.rating,
      content: input.content,
      listenedAt: input.listenedAt ? new Date(input.listenedAt) : undefined,
    },
    select: reviewSelect,
  });

  // Update streak
  await updateStreak(userId, input.albumId);

  return review;
}

export async function updateReview(reviewId: string, userId: string, input: UpdateReviewInput) {
  const review = await prisma.review.findUnique({ where: { id: reviewId }, select: { userId: true } });
  if (!review) throw new NotFoundError('Review');
  if (review.userId !== userId) throw new ForbiddenError();

  return prisma.review.update({
    where: { id: reviewId },
    data: {
      ...input,
      listenedAt: input.listenedAt ? new Date(input.listenedAt) : undefined,
    },
    select: reviewSelect,
  });
}

export async function deleteReview(reviewId: string, userId: string) {
  const review = await prisma.review.findUnique({ where: { id: reviewId }, select: { userId: true } });
  if (!review) throw new NotFoundError('Review');
  if (review.userId !== userId) throw new ForbiddenError();
  await prisma.review.delete({ where: { id: reviewId } });
}

async function updateStreak(userId: string, albumId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.streak.upsert({
    where: { userId_date: { userId, date: today } },
    update: {},
    create: { userId, albumId, date: today },
  });
}
