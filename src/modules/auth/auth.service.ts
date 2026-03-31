import { prisma } from '../../database/prisma';
import { hashPassword, comparePassword } from '../../shared/utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../shared/utils/jwt';
import { ConflictError, UnauthorizedError } from '../../shared/errors/AppError';
import type { RegisterInput, LoginInput } from './auth.schemas';

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { username: input.username }] },
    select: { email: true, username: true },
  });

  if (existing) {
    if (existing.email === input.email) throw new ConflictError('Email already in use');
    throw new ConflictError('Username already taken');
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      username: input.username,
      email: input.email,
      displayName: input.displayName ?? input.username,
      passwordHash,
    },
    select: { id: true, username: true, email: true, displayName: true, createdAt: true },
  });

  const accessToken = signAccessToken({ userId: user.id, username: user.username });
  const refreshToken = signRefreshToken({ userId: user.id });

  return { user, accessToken, refreshToken };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, username: true, email: true, displayName: true, passwordHash: true },
  });

  if (!user || !(await comparePassword(input.password, user.passwordHash))) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const { passwordHash: _, ...safeUser } = user;
  const accessToken = signAccessToken({ userId: user.id, username: user.username });
  const refreshToken = signRefreshToken({ userId: user.id });

  return { user: safeUser, accessToken, refreshToken };
}

export async function refreshTokens(token: string) {
  const payload = verifyRefreshToken(token);

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, username: true },
  });

  if (!user) throw new UnauthorizedError('User not found');

  const accessToken = signAccessToken({ userId: user.id, username: user.username });
  const refreshToken = signRefreshToken({ userId: user.id });

  return { accessToken, refreshToken };
}
