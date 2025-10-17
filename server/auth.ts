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

// Simple auth middleware - checks for userId in session
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = req.session.userId;
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = await dbStorage.getUser(userId);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  req.user = {
    id: user.id,
    email: user.email,
    username: user.username,
  };

  next();
}

// Optional auth - sets user if authenticated but doesn't require it
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const userId = req.session.userId;
  
  if (userId) {
    const user = await dbStorage.getUser(userId);
    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        username: user.username,
      };
    }
  }

  next();
}
