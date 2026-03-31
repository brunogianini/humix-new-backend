import { prisma } from '../../database/prisma';
import { NotFoundError, ConflictError, AppError } from '../../shared/errors/AppError';

export async function follow(followerId: string, targetUsername: string) {
  const target = await prisma.user.findUnique({
    where: { username: targetUsername },
    select: { id: true },
  });
  if (!target) throw new NotFoundError('User');
  if (target.id === followerId) throw new AppError('Cannot follow yourself', 400);

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId: target.id } },
  });
  if (existing) throw new ConflictError('Already following this user');

  await prisma.follow.create({ data: { followerId, followingId: target.id } });
}

export async function unfollow(followerId: string, targetUsername: string) {
  const target = await prisma.user.findUnique({
    where: { username: targetUsername },
    select: { id: true },
  });
  if (!target) throw new NotFoundError('User');

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId: target.id } },
  });
  if (!existing) throw new NotFoundError('Follow relationship');

  await prisma.follow.delete({
    where: { followerId_followingId: { followerId, followingId: target.id } },
  });
}

export async function getFeed(userId: string, page: number, limit: number) {
  const skip = (page - 1) * limit;

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: {
        user: { followers: { some: { followerId: userId } } },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        rating: true,
        content: true,
        createdAt: true,
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
      },
    }),
    prisma.review.count({
      where: { user: { followers: { some: { followerId: userId } } } },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);
  return {
    data: reviews,
    meta: { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
  };
}
