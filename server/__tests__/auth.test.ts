import request from 'supertest';
import express from 'express';
import bcrypt from 'bcrypt';
import { dbStorage } from '../db-storage';
import authRouter from '../routes/auth';

// Mock the database storage
jest.mock('../db-storage');
const mockDbStorage = dbStorage as jest.Mocked<typeof dbStorage>;

describe('Auth Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    jest.clearAllMocks();
  });

  describe('POST /api/auth/signup', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      };

      mockDbStorage.getUserByEmail.mockResolvedValue(null);
      mockDbStorage.createUser.mockResolvedValue({
        id: 'user-1',
        email: userData.email,
        username: userData.username,
        createdAt: new Date(),
      });

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(userData.email);
      expect(mockDbStorage.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: userData.email,
          username: userData.username,
        })
      );
    });

    it('should return error for existing email', async () => {
      const userData = {
        email: 'existing@example.com',
        username: 'testuser',
        password: 'password123',
      };

      mockDbStorage.getUserByEmail.mockResolvedValue({
        id: 'user-1',
        email: userData.email,
        username: 'existing',
        createdAt: new Date(),
      });

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email already registered');
    });

    it('should validate input data', async () => {
      const invalidData = {
        email: 'invalid-email',
        username: 'tu',
        password: '123',
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user successfully', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 'user-1',
        email: loginData.email,
        username: 'testuser',
        passwordHash: await bcrypt.hash(loginData.password, 10),
        createdAt: new Date(),
      };

      mockDbStorage.getUserByEmail.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(loginData.email);
    });

    it('should return error for invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const mockUser = {
        id: 'user-1',
        email: loginData.email,
        username: 'testuser',
        passwordHash: await bcrypt.hash('correctpassword', 10),
        createdAt: new Date(),
      };

      mockDbStorage.getUserByEmail.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid email or password');
    });
  });
});
