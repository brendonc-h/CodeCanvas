// Jest setup file
import 'dotenv/config';

// Mock external dependencies
jest.mock('../db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    execute: jest.fn(),
  },
}));

jest.mock('../docker-manager', () => ({
  dockerManager: {
    createSandbox: jest.fn(),
    stopContainer: jest.fn(),
    stopAndReleaseContainer: jest.fn(),
    execCommand: jest.fn(),
  },
}));

jest.mock('../ai-client', () => ({
  aiClient: {
    generate: jest.fn(),
    listModels: jest.fn(),
    checkProviderHealth: jest.fn(),
  },
}));

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
