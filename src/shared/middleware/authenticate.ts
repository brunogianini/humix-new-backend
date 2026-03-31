import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { UnauthorizedError } from '../errors/AppError';

export interface AuthenticatedRequest extends Request {
  userId: string;
  username: string;
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('No token provided'));
  }

  const token = authHeader.slice(7);
  const payload = verifyAccessToken(token);
  (req as AuthenticatedRequest).userId = payload.userId;
  (req as AuthenticatedRequest).username = payload.username;
  next();
}

export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();

  try {
    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);
    (req as AuthenticatedRequest).userId = payload.userId;
    (req as AuthenticatedRequest).username = payload.username;
  } catch {
    // continue unauthenticated
  }
  next();
}
