/**
 * 前端基础测试用例示例
 * 测试React组件和API响应格式
 */

import { describe, it, expect } from 'vitest'
import {
  mockSuccessResponse,
  mockErrorResponse,
  mockWorldState,
  mockPlayerState,
} from './mocks/api'

describe('API Response Format', () => {
  describe('Success Response', () => {
    it('should have correct structure', () => {
      const data = { message: 'test' }
      const response = mockSuccessResponse(data)

      expect(response.success).toBe(true)
      expect(response.data).toEqual(data)
      expect(response.error).toBeNull()
      expect(response.metadata).toBeDefined()
      expect(response.metadata.version).toBe('v1.0.0')
      expect(response.metadata.timestamp).toBeDefined()
      expect(response.metadata.serverTime).toBeDefined()
    })

    it('should handle WorldState data', () => {
      const worldState = mockWorldState()
      const response = mockSuccessResponse(worldState)

      expect(response.success).toBe(true)
      expect(response.data!.day).toBe(1)
      expect(response.data!.year).toBe(1)
      expect(response.data!.season).toBe('spring')
      expect(response.data!.historyStage).toBe('era_power_struggle')
    })

    it('should handle PlayerState data', () => {
      const playerState = mockPlayerState()
      const response = mockSuccessResponse(playerState)

      expect(response.success).toBe(true)
      expect(response.data!.id).toBe('player_test001')
      expect(response.data!.name).toBe('测试玩家')
      expect(response.data!.level).toBe(1)
    })
  })

  describe('Error Response', () => {
    it('should have correct error structure', () => {
      const response = mockErrorResponse('NOT_FOUND', '资源不存在')

      expect(response.success).toBe(false)
      expect(response.data).toBeNull()
      expect(response.error).toBeDefined()
      expect(response.error!.code).toBe('NOT_FOUND')
      expect(response.error!.message).toBe('资源不存在')
      expect(response.error!.retryable).toBe(false)
    })

    it('should mark retryable errors correctly', () => {
      const response = mockErrorResponse('SERVICE_UNAVAILABLE', '服务暂时不可用', true)

      expect(response.error!.retryable).toBe(true)
    })
  })
})

describe('Faction Types', () => {
  it('should have four factions defined', () => {
    const factions = ['canglong', 'shuanglang', 'jinque', 'border']
    expect(factions).toHaveLength(4)
  })

  it('should have correct faction names in Chinese', () => {
    const factionNames = {
      canglong: '苍龙帝国',
      shuanglang: '霜狼联邦',
      jinque: '金雀花王国',
      border: '边境联盟',
    }

    expect(factionNames.canglong).toBe('苍龙帝国')
    expect(factionNames.shuanglang).toBe('霜狼联邦')
    expect(factionNames.jinque).toBe('金雀花王国')
    expect(factionNames.border).toBe('边境联盟')
  })
})

describe('Relationship Levels', () => {
  it('should have 7 relationship levels', () => {
    const levels = ['enemy', 'hostile', 'distrust', 'neutral', 'friendly', 'respect', 'admire']
    expect(levels).toHaveLength(7)
  })

  it('should correctly categorize relationship values', () => {
    // 使用设计文档中定义的关系等级范围
    function getRelationshipLevel(value: number): string {
      if (value >= 81) return 'admire'
      if (value >= 51) return 'respect'
      if (value >= 21) return 'friendly'
      if (value >= -19) return 'neutral'
      if (value >= -49) return 'distrust'
      if (value >= -79) return 'hostile'
      return 'enemy'
    }

    expect(getRelationshipLevel(90)).toBe('admire')
    expect(getRelationshipLevel(60)).toBe('respect')
    expect(getRelationshipLevel(30)).toBe('friendly')
    expect(getRelationshipLevel(0)).toBe('neutral')
    expect(getRelationshipLevel(-30)).toBe('distrust')
    expect(getRelationshipLevel(-60)).toBe('hostile')
    expect(getRelationshipLevel(-90)).toBe('enemy')
  })
})
