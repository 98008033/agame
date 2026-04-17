// Authentication Middleware

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { unauthorizedError, AppError } from './errorHandler.js';

const JWT_SECRET = process.env['JWT_SECRET'] ?? 'dev-secret-change-in-production';

export interface JwtPayload {
  playerId: string;
  iat: number;
  exp: number;
}

// Auth middleware for protected routes
export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  // Development mode bypass - auto-authenticate with test player
  if (process.env['NODE_ENV'] === 'development' && !req.headers['authorization']) {
    req.playerId = 'test-player-001';
    next();
    return;
  }

  const authHeader = req.headers['authorization'];

  if (!authHeader?.startsWith('Bearer ')) {
    next(unauthorizedError('缺少认证令牌'));
    return;
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.playerId = payload.playerId;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      next(unauthorizedError('令牌已过期'));
    } else if (err instanceof jwt.JsonWebTokenError) {
      next(unauthorizedError('无效的令牌'));
    } else {
      next(new AppError('认证失败', 'UNAUTHORIZED', 401, undefined, false));
    }
  }
}

// Optional auth middleware (doesn't fail if no token)
export function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];

  if (!authHeader?.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.playerId = payload.playerId;
  } catch {
    // Ignore errors for optional auth
  }

  next();
}

// Generate JWT token
export function generateToken(playerId: string): string {
  return jwt.sign({ playerId }, JWT_SECRET, { expiresIn: '24h' });
}

// Generate refresh token (longer expiry)
export function generateRefreshToken(playerId: string): string {
  return jwt.sign({ playerId, type: 'refresh' }, JWT_SECRET, { expiresIn: '7d' });
}

// Verify refresh token
export function verifyRefreshToken(token: string): JwtPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    if ((payload as JwtPayload & { type?: string }).type === 'refresh') {
      return payload;
    }
    return null;
  } catch {
    return null;
  }
}