import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { dbStorage } from './db-storage';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

// Supabase auth middleware - verifies JWT token
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get or create user in our database
    let dbUser = await dbStorage.getUserByEmail(user.email!);
    if (!dbUser) {
      // Extract username from email or use a default
      const username = user.email!.split('@')[0];
      dbUser = await dbStorage.createUser({
        email: user.email!,
        username,
      });
    }

    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      username: dbUser.username,
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
}

// Optional auth - sets user if authenticated but doesn't require it
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (!error && user) {
      let dbUser = await dbStorage.getUserByEmail(user.email!);
      if (!dbUser) {
        const username = user.email!.split('@')[0];
        dbUser = await dbStorage.createUser({
          email: user.email!,
          username,
        });
      }

      req.user = {
        id: dbUser.id,
        email: dbUser.email,
        username: dbUser.username,
      };
    }
  } catch (error) {
    // Ignore auth errors for optional auth
  }

  next();
}
