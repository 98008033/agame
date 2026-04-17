/**
 * Backend Test Setup
 * Database mock and test utilities
 */

import { vi, afterAll, beforeEach } from 'vitest';

// Mock Prisma Client
vi.mock('@prisma/client', () => {
  const mockPrisma = {
    worldState: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    player: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    npc: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    event: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    decision: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    dailyNews: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    $disconnect: vi.fn(),
  };

  return {
    PrismaClient: vi.fn(() => mockPrisma),
  };
});

// Mock Redis
vi.mock('ioredis', () => {
  const mockRedis = {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    quit: vi.fn(),
  };

  return {
    default: vi.fn(() => mockRedis),
  };
});

// 测试前清理
beforeEach(() => {
  vi.clearAllMocks();
});

// 全局清理
afterAll(async () => {
  vi.resetAllMocks();
});