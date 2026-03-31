import { prisma } from '../../database/prisma';
import { NotFoundError, ForbiddenError } from '../../shared/errors/AppError';
import { getPaginationParams, buildPaginatedResult } from '../../shared/utils/pagination';
import type { UpdateProfileInput } from './users.schemas';

export async function getProfile(username: string, viewerId?: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      createdAt: true,
      _count: {
        select: {
          reviews: true,
          followers: true,
          following: true,
        },
      },
    },
  });

  if (!user) throw new NotFoundError('User');

  let isFollowing = false;
  if (viewerId && viewerId !== user.id) {
    const follow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: viewerId, followingId: user.id } },
    });
    isFollowing = !!follow;
  }

  return { ...user, isFollowing };
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  return prisma.user.update({
    where: { id: userId },
    data: input,
    select: { id: true, username: true, displayName: true, bio: true, avatarUrl: true },
  });
}

export async function getUserAlbums(username: string, page: number, limit: number) {
  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) throw new NotFoundError('User');

  const { skip, take } = getPaginationParams(page, limit);
  const [userAlbums, total] = await Promise.all([
    prisma.userAlbum.findMany({
      where: { userId: user.id },
      skip,
      take,
      orderBy: { updatedAt: 'desc' },
      include: {
        album: {
          select: {
            id: true,
            title: true,
            slug: true,
            coverUrl: true,
            releaseYear: true,
            artist: { select: { name: true, slug: true } },
          },
        },
      },
    }),
    prisma.userAlbum.count({ where: { userId: user.id } }),
  ]);

  return buildPaginatedResult(userAlbums, total, page, limit);
}

export async function getUserReviews(username: string, page: number, limit: number) {
  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) throw new NotFoundError('User');

  const { skip, take } = getPaginationParams(page, limit);
  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: { userId: user.id },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        album: {
          select: {
            id: true,
            title: true,
            slug: true,
            coverUrl: true,
            releaseYear: true,
            artist: { select: { name: true, slug: true } },
          },
        },
      },
    }),
    prisma.review.count({ where: { userId: user.id } }),
  ]);

  return buildPaginatedResult(reviews, total, page, limit);
}

export async function getFollowers(username: string, page: number, limit: number) {
  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) throw new NotFoundError('User');

  const { skip, take } = getPaginationParams(page, limit);
  const [followers, total] = await Promise.all([
    prisma.follow.findMany({
      where: { followingId: user.id },
      skip,
      take,
      include: {
        follower: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    }),
    prisma.follow.count({ where: { followingId: user.id } }),
  ]);

  return buildPaginatedResult(
    followers.map((f) => f.follower),
    total,
    page,
    limit,
  );
}

export async function getFollowing(username: string, page: number, limit: number) {
  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) throw new NotFoundError('User');

  const { skip, take } = getPaginationParams(page, limit);
  const [following, total] = await Promise.all([
    prisma.follow.findMany({
      where: { followerId: user.id },
      skip,
      take,
      include: {
        following: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    }),
    prisma.follow.count({ where: { followerId: user.id } }),
  ]);

  return buildPaginatedResult(
    following.map((f) => f.following),
    total,
    page,
    limit,
  );
}

export async function deleteAccount(userId: string, requesterId: string) {
  if (userId !== requesterId) throw new ForbiddenError();
  await prisma.user.delete({ where: { id: userId } });
}
