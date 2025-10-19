import { Request, Response, NextFunction } from 'express';
import { dbStorage } from './db-storage';

// Add user to request
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        username: string;
      };
    }
  }
}

// Session-based auth middleware
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Check for session
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user from database
    const dbUser = await dbStorage.getUserById(req.session.userId);
    if (!dbUser) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      username: dbUser.username,
    };

    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

// Optional auth - sets user if authenticated but doesn't require it
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.session?.userId) {
      const dbUser = await dbStorage.getUserById(req.session.userId);
      if (dbUser) {
        req.user = {
          id: dbUser.id,
          email: dbUser.email,
          username: dbUser.username,
        };
      }
    }
  } catch (error) {
    // Ignore auth errors for optional auth
  }

  next();
}
