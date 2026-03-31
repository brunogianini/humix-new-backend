import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import type { RegisterInput, LoginInput, RefreshTokenInput } from './auth.schemas';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.register(req.body as RegisterInput);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.login(req.body as LoginInput);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body as RefreshTokenInput;
    const result = await authService.refreshTokens(refreshToken);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export function me(req: Request, res: Response) {
  res.json({ userId: (req as any).userId, username: (req as any).username });
}
