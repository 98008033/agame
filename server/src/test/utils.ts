/**
 * Backend API Test Utilities
 * Supertest helpers and mock data
 */

import type { ApiResponse, ErrorCode } from '../types/api';

/**
 * 创建标准API成功响应
 */
export function createSuccessResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    error: null,
    metadata: {
      timestamp: new Date().toISOString(),
      version: 'v1.0.0',
      requestId: 'test_request_id',
      serverTime: Date.now(),
    },
  };
}

/**
 * 创建标准API错误响应
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string
): ApiResponse<null> {
  return {
    success: false,
    data: null,
    error: {
      code,
      message,
      details: undefined,
      retryable: false,
    },
    metadata: {
      timestamp: new Date().toISOString(),
      version: 'v1.0.0',
      requestId: 'test_request_id',
      serverTime: Date.now(),
    },
  };
}

/**
 * Mock WorldState 数据
 */
export function mockWorldStateData() {
  return {
    id: 1,
    day: 1,
    year: 1,
    month: 1,
    season: 'spring',
    phase: 'morning',
    historyStage: 'era_power_struggle',
    snapshotId: 'snapshot_001',
    balance: {
      military: { canglong: 100, shuanglang: 100, jinque: 100, border: 100 },
      economy: { canglong: 100, shuanglang: 100, jinque: 100, border: 100 },
    },
    factions: {},
    cities: {},
    activeEvents: [],
    globalVariables: {},
    createdAt: new Date(),
  };
}

/**
 * Mock Player 数据
 */
export function mockPlayerData() {
  return {
    id: 'player_001',
    userId: 'user_001',
    name: '测试玩家',
    age: 18,
    faction: null,
    factionLevel: 'neutral',
    titles: [],
    level: 1,
    experience: 0,
    attributes: {
      strength: 10,
      intelligence: 10,
      charisma: 10,
      luck: 10,
    },
    reputation: {},
    skills: {},
    relationships: {},
    tags: [],
    resources: {
      gold: 100,
      influence: 50,
    },
    location: {
      cityId: 'city_001',
      region: 'canglong',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Mock Event 数据
 */
export function mockEventData() {
  return {
    id: 'event_001',
    playerId: 'player_001',
    type: 'political_decision',
    category: 'personal',
    title: '测试事件',
    description: '这是一个测试事件',
    narrativeText: '故事背景...',
    choices: [
      {
        index: 0,
        label: '选项A',
        description: '选项A描述',
        consequences: {
          attributeChanges: { intelligence: 5 },
          resourceChanges: { gold: -10 },
        },
      },
      {
        index: 1,
        label: '选项B',
        description: '选项B描述',
        consequences: {
          attributeChanges: { strength: 5 },
          resourceChanges: { influence: -5 },
        },
      },
    ],
    scope: 'personal',
    status: 'pending',
    expiresAt: new Date(Date.now() + 3600000),
    createdAt: new Date(),
  };
}

/**
 * 生成测试JWT Token
 */
export function generateTestToken(userId: string): string {
  // 简化的测试token - 实际测试中应该使用真实的JWT生成
  return `test_token_${userId}_${Date.now()}`;
}