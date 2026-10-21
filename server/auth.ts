import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { db, UserRecord } from './db';
import { UserProfile } from '../src/types/game';

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, actualSalt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt: actualSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const result = hashPassword(password, salt);
  return result.hash === hash;
}

export function sanitizeUser(record: UserRecord): UserProfile {
  return {
    id: record.id,
    username: record.username,
    displayName: record.displayName,
    avatarId: record.avatarId,
    stats: record.stats,
    createdAt: record.createdAt,
  };
}

export function createSession(userId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  db.sessions.set(token, userId);
  return token;
}

export function getUserIdFromSession(token?: string): string | null {
  if (!token) return null;
  return db.sessions.get(token) || null;
}

export interface AuthenticatedRequest extends Request {
  user?: UserProfile;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (req.cookies?.sessionToken as string | undefined);

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No session token provided' });
  }

  const userId = getUserIdFromSession(token);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
  }

  const user = db.findUserById(userId);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: User not found' });
  }

  req.user = sanitizeUser(user);
  next();
}
