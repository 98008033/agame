/**
 * API Response Mock Utilities
 * 用于测试API响应格式
 */

// API响应类型定义
interface ApiError {
  code: string
  message: string
  details: unknown | null
  retryable: boolean
}

interface ApiResponse<T> {
  success: boolean
  data: T | null
  error: ApiError | null
  metadata: {
    timestamp: string
    version: string
    requestId: string
    serverTime: number
  }
}

/**
 * 创建成功响应mock
 */
export function mockSuccessResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    error: null,
    metadata: {
      timestamp: new Date().toISOString(),
      version: 'v1.0.0',
      requestId: `test_req_${Date.now()}`,
      serverTime: Date.now(),
    },
  }
}

/**
 * 创建错误响应mock
 */
export function mockErrorResponse(
  code: string,
  message: string,
  retryable = false
): ApiResponse<null> {
  return {
    success: false,
    data: null,
    error: {
      code,
      message,
      details: null,
      retryable,
    },
    metadata: {
      timestamp: new Date().toISOString(),
      version: 'v1.0.0',
      requestId: `test_req_${Date.now()}`,
      serverTime: Date.now(),
    },
  }
}

/**
 * Mock WorldState数据
 */
export function mockWorldState() {
  return {
    day: 1,
    year: 1,
    month: 1,
    season: 'spring',
    phase: 'morning',
    historyStage: 'era_power_struggle',
    balance: {
      military: { canglong: 100, shuanglang: 100, jinque: 100, border: 100 },
      economy: { canglong: 100, shuanglang: 100, jinque: 100, border: 100 },
    },
    factions: {},
    cities: {},
  }
}

/**
 * Mock PlayerState数据
 */
export function mockPlayerState() {
  return {
    id: 'player_test001',
    userId: 'user_test001',
    name: '测试玩家',
    age: 18,
    faction: null,
    factionLevel: 'neutral',
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
    resources: {
      gold: 100,
      influence: 50,
    },
  }
}
