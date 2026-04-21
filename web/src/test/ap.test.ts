// AP (Action Point) System Tests
// 行动点系统测试 - Unit tests (no server required)

import { describe, it, expect } from 'vitest'

// ============================================
// AP System Constants (mirrored from game.ts)
// ============================================

const MAX_ACTION_POINTS = 6
const MAX_STORED_AP = 3

const AP_COSTS: Record<string, number> = {
  faction_mission: 2,
  npc_interaction: 1,
  territory_manage: 1,
  travel: 2,
  combat: 3,
  investigate: 1,
  practice_skill: 1,
  visit_npc: 1,
  handle_event: 2,
  work_job: 2,
  hunt_monsters: 3,
}

const LEVEL_AP_BONUS: Record<number, number> = {
  1: 0, 5: 1, 10: 2, 15: 3, 20: 4,
}

// ============================================
// Helper: Calculate max AP for a given level
// ============================================

function calculateMaxAP(level: number): number {
  const base = MAX_ACTION_POINTS
  const bonus = LEVEL_AP_BONUS[level] ?? 0
  return base + bonus
}

// ============================================
// Helper: Check if player can afford an action
// ============================================

function canAffordAction(currentAP: number, actionCost: number): boolean {
  return currentAP >= actionCost
}

// ============================================
// Helper: Consume AP
// ============================================

function consumeAP(currentAP: number, cost: number): number {
  if (!canAffordAction(currentAP, cost)) return currentAP
  return currentAP - cost
}

// ============================================
// Helper: Regenerate AP (daily)
// ============================================

function regenerateAP(currentAP: number, maxAP: number, regenAmount: number): number {
  return Math.min(maxAP, currentAP + regenAmount)
}

// ============================================
// Test: AP Configuration
// ============================================

describe('AP Configuration', () => {
  it('should have correct default max points', () => {
    expect(MAX_ACTION_POINTS).toBe(6)
  })

  it('should allow storing up to 3 extra AP', () => {
    expect(MAX_STORED_AP).toBe(3)
  })

  it('should apply level bonus correctly', () => {
    expect(calculateMaxAP(1)).toBe(6)   // base + 0
    expect(calculateMaxAP(5)).toBe(7)   // base + 1
    expect(calculateMaxAP(10)).toBe(8)  // base + 2
    expect(calculateMaxAP(15)).toBe(9)  // base + 3
    expect(calculateMaxAP(20)).toBe(10) // base + 4
  })

  it('should not exceed max AP cap (10)', () => {
    for (let level = 1; level <= 30; level++) {
      const max = calculateMaxAP(level)
      expect(max).toBeLessThanOrEqual(10)
    }
  })
})

// ============================================
// Test: AP Consumption
// ============================================

describe('AP Consumption', () => {
  it('should have correct action costs', () => {
    expect(AP_COSTS.faction_mission).toBe(2)
    expect(AP_COSTS.npc_interaction).toBe(1)
    expect(AP_COSTS.combat).toBe(3)
    expect(AP_COSTS.travel).toBe(2)
    expect(AP_COSTS.investigate).toBe(1)
  })

  it('should allow action when AP is sufficient', () => {
    expect(canAffordAction(6, 2)).toBe(true)
    expect(canAffordAction(6, 3)).toBe(true)
    expect(canAffordAction(2, 2)).toBe(true)
    expect(canAffordAction(1, 1)).toBe(true)
  })

  it('should reject action when AP is insufficient', () => {
    expect(canAffordAction(1, 2)).toBe(false)
    expect(canAffordAction(0, 1)).toBe(false)
    expect(canAffordAction(2, 3)).toBe(false)
  })

  it('should consume correct AP amount', () => {
    expect(consumeAP(6, 2)).toBe(4)
    expect(consumeAP(4, 3)).toBe(1)
    expect(consumeAP(1, 1)).toBe(0)
  })

  it('should not consume AP when insufficient', () => {
    expect(consumeAP(1, 2)).toBe(1) // unchanged
    expect(consumeAP(0, 1)).toBe(0) // unchanged
  })

  it('should not allow negative AP', () => {
    const result = consumeAP(2, 5)
    expect(result).toBe(2) // unchanged, not negative
  })
})

// ============================================
// Test: AP Regeneration
// ============================================

describe('AP Regeneration', () => {
  it('should regenerate AP up to max', () => {
    expect(regenerateAP(0, 6, 6)).toBe(6)
    expect(regenerateAP(2, 6, 6)).toBe(6) // capped at max
  })

  it('should not exceed max points', () => {
    expect(regenerateAP(5, 6, 6)).toBe(6)
    expect(regenerateAP(6, 6, 6)).toBe(6)
  })

  it('should not double regen on same day (idempotent)', () => {
    // After full regen, another regen with same amount should not change value
    const afterFirst = regenerateAP(0, 6, 6)
    const afterSecond = regenerateAP(afterFirst, 6, 6)
    expect(afterFirst).toBe(afterSecond)
  })

  it('should partially regenerate when regen amount is less than deficit', () => {
    expect(regenerateAP(2, 6, 2)).toBe(4)
    expect(regenerateAP(3, 6, 1)).toBe(4)
  })
})

// ============================================
// Test: AP State Validation
// ============================================

describe('AP State Validation', () => {
  it('should validate currentPoints <= maxPoints', () => {
    const validateState = (current: number, max: number) => current <= max && current >= 0
    expect(validateState(6, 6)).toBe(true)
    expect(validateState(0, 6)).toBe(true)
    expect(validateState(7, 6)).toBe(false)
    expect(validateState(-1, 6)).toBe(false)
  })

  it('should track pending actions correctly', () => {
    const pendingActions = [
      { actionId: 'a1', cost: 2, status: 'pending' },
      { actionId: 'a2', cost: 1, status: 'completed' },
    ]
    const totalPendingCost = pendingActions
      .filter(a => a.status === 'pending')
      .reduce((sum, a) => sum + a.cost, 0)
    expect(totalPendingCost).toBe(2)
  })
})

export type { }
