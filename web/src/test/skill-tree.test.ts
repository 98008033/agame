// Skill Tree System Tests
// 技能树系统测试

import { describe, it, expect } from 'vitest'
import {
  skillDefinitions,
  skillExpThresholds,
  type SkillDefinition,
  type SkillCategory,
  type SkillId,
  usePlayerStore,
} from '../stores/playerStore'

// ============================================
// Helper: Get skill by ID from definitions
// ============================================

function getSkillById(id: SkillId): SkillDefinition | undefined {
  return skillDefinitions.find(d => d.id === id)
}

// ============================================
// Helper: Check if prerequisites are met
// ============================================

function checkPrerequisites(
  skillId: SkillId,
  playerSkillLevels: Record<SkillId, number>
): { met: boolean; missing?: string } {
  const skill = getSkillById(skillId)
  if (!skill) return { met: false, missing: 'skill not found' }
  if (!skill.prerequisite) return { met: true }

  const prereqLevel = playerSkillLevels[skill.prerequisite] ?? 0
  const requiredLevel = skill.prerequisiteLevel ?? 1

  if (prereqLevel < requiredLevel) {
    return { met: false, missing: `${skill.prerequisite} needs Lv.${requiredLevel}` }
  }
  return { met: true }
}

// ============================================
// Helper: Calculate level from EXP
// ============================================

function calculateLevelFromExp(exp: number, maxLevel: number): number {
  let level = 1
  for (let l = 2; l <= maxLevel; l++) {
    if (exp >= skillExpThresholds[l]) {
      level = l
    } else {
      break
    }
  }
  return level
}

// ============================================
// Test: Skill Definitions Structure
// ============================================

describe('Skill Definitions Structure', () => {
  it('should have all skills defined with required fields', () => {
    expect(skillDefinitions.length).toBeGreaterThan(0)

    for (const skill of skillDefinitions) {
      expect(skill.id).toBeDefined()
      expect(skill.name).toBeDefined()
      expect(skill.category).toBeDefined()
      expect(skill.maxLevel).toBeGreaterThan(0)
      expect(skill.description).toBeDefined()
      expect(skill.icon).toBeDefined()
    }
  })

  it('should have unique skill IDs', () => {
    const ids = skillDefinitions.map(s => s.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('should have valid skill categories', () => {
    const validCategories: SkillCategory[] = ['strategy', 'combat', 'business', 'general']
    for (const skill of skillDefinitions) {
      expect(validCategories).toContain(skill.category)
    }
  })

  it('should have all expected skill IDs present', () => {
    const expectedSkills: SkillId[] = [
      'survival',
      'intelligence_analysis',
      'political_control',
      'combat_technique',
      'military_command',
      'business_trade',
      'industry_management',
    ]

    for (const expectedId of expectedSkills) {
      const skill = getSkillById(expectedId)
      expect(skill).toBeDefined()
      expect(skill?.id).toBe(expectedId)
    }
  })

  it('should have correct max levels per skill type', () => {
    const survival = getSkillById('survival')
    expect(survival?.maxLevel).toBe(3)

    const intelligence = getSkillById('intelligence_analysis')
    expect(intelligence?.maxLevel).toBe(3)

    const political = getSkillById('political_control')
    expect(political?.maxLevel).toBe(6)

    const combat = getSkillById('combat_technique')
    expect(combat?.maxLevel).toBe(3)

    const military = getSkillById('military_command')
    expect(military?.maxLevel).toBe(6)
  })
})

// ============================================
// Test: Prerequisite Validation
// ============================================

describe('Skill Prerequisite Validation', () => {
  it('should allow unlocking skills without prerequisites', () => {
    const survival = getSkillById('survival')
    expect(survival?.prerequisite).toBeUndefined()

    const result = checkPrerequisites('survival', {} as Record<SkillId, number>)
    expect(result.met).toBe(true)
  })

  it('should block political_control without intelligence_analysis Lv.3', () => {
    const result = checkPrerequisites('political_control', {
      intelligence_analysis: 2,
    } as Record<SkillId, number>)
    expect(result.met).toBe(false)
    expect(result.missing).toContain('Lv.3')
  })

  it('should allow political_control with intelligence_analysis Lv.3', () => {
    const result = checkPrerequisites('political_control', {
      intelligence_analysis: 3,
    } as Record<SkillId, number>)
    expect(result.met).toBe(true)
  })

  it('should block military_command without combat_technique Lv.3', () => {
    const result = checkPrerequisites('military_command', {
      combat_technique: 2,
    } as Record<SkillId, number>)
    expect(result.met).toBe(false)
  })

  it('should allow military_command with combat_technique Lv.3', () => {
    const result = checkPrerequisites('military_command', {
      combat_technique: 3,
    } as Record<SkillId, number>)
    expect(result.met).toBe(true)
  })

  it('should block industry_management without business_trade Lv.3', () => {
    const result = checkPrerequisites('industry_management', {
      business_trade: 2,
    } as Record<SkillId, number>)
    expect(result.met).toBe(false)
  })

  it('should allow industry_management with business_trade Lv.3', () => {
    const result = checkPrerequisites('industry_management', {
      business_trade: 3,
    } as Record<SkillId, number>)
    expect(result.met).toBe(true)
  })
})

// ============================================
// Test: Skill Level Progression (EXP to Level)
// ============================================

describe('Skill Level Progression', () => {
  it('should have correct EXP thresholds', () => {
    expect(skillExpThresholds[1]).toBe(0)
    expect(skillExpThresholds[2]).toBe(100)
    expect(skillExpThresholds[3]).toBe(300)
    expect(skillExpThresholds[4]).toBe(600)
    expect(skillExpThresholds[5]).toBe(1000)
    expect(skillExpThresholds[6]).toBe(1500)
  })

  it('should calculate correct level from EXP', () => {
    expect(calculateLevelFromExp(0, 3)).toBe(1)
    expect(calculateLevelFromExp(50, 3)).toBe(1)
    expect(calculateLevelFromExp(100, 3)).toBe(2)
    expect(calculateLevelFromExp(299, 3)).toBe(2)
    expect(calculateLevelFromExp(300, 3)).toBe(3)
    expect(calculateLevelFromExp(500, 6)).toBe(3)
    expect(calculateLevelFromExp(600, 6)).toBe(4)
    expect(calculateLevelFromExp(1500, 6)).toBe(6)
  })

  it('should not exceed max level', () => {
    const survival = getSkillById('survival')!
    const level = calculateLevelFromExp(9999, survival.maxLevel)
    expect(level).toBeLessThanOrEqual(survival.maxLevel)
  })

  it('thresholds should be monotonically increasing', () => {
    for (let i = 2; i <= 6; i++) {
      expect(skillExpThresholds[i]).toBeGreaterThan(skillExpThresholds[i - 1])
    }
  })
})

// ============================================
// Test: Category Filtering
// ============================================

describe('Category Filtering', () => {
  it('should filter strategy skills correctly', () => {
    const strategySkills = skillDefinitions.filter(s => s.category === 'strategy')
    expect(strategySkills.length).toBe(2)
    expect(strategySkills.map(s => s.id)).toContain('intelligence_analysis')
    expect(strategySkills.map(s => s.id)).toContain('political_control')
  })

  it('should filter combat skills correctly', () => {
    const combatSkills = skillDefinitions.filter(s => s.category === 'combat')
    expect(combatSkills.length).toBe(2)
    expect(combatSkills.map(s => s.id)).toContain('combat_technique')
    expect(combatSkills.map(s => s.id)).toContain('military_command')
  })

  it('should filter business skills correctly', () => {
    const businessSkills = skillDefinitions.filter(s => s.category === 'business')
    expect(businessSkills.length).toBe(2)
    expect(businessSkills.map(s => s.id)).toContain('business_trade')
    expect(businessSkills.map(s => s.id)).toContain('industry_management')
  })

  it('should filter general skills correctly', () => {
    const generalSkills = skillDefinitions.filter(s => s.category === 'general')
    expect(generalSkills.length).toBe(1)
    expect(generalSkills[0]?.id).toBe('survival')
  })

  it('should return empty array for non-existent category', () => {
    const fake = skillDefinitions.filter(s => s.category === 'nonexistent')
    expect(fake).toEqual([])
  })
})

// ============================================
// Test: Store Skill Operations
// ============================================

describe('Store Skill Operations', () => {
  it('should return 0 for unlearned skill', () => {
    const store = usePlayerStore.getState()
    const level = store.getSkillLevel('political_control')
    expect(level).toBe(0)
  })

  it('should return correct level for learned skill', () => {
    const store = usePlayerStore.getState()
    // survival is learned by default
    const level = store.getSkillLevel('survival')
    expect(level).toBe(1)
  })

  it('should add EXP and level up correctly', () => {
    const store = usePlayerStore.getState()

    // Unlock intelligence_analysis first (needs survival Lv.3)
    // Add EXP to survival to reach level 3
    store.addSkillExp('survival', 300) // enough for level 3

    // Now unlock intelligence_analysis
    store.unlockSkill('intelligence_analysis')

    // Add EXP to intelligence_analysis
    store.addSkillExp('intelligence_analysis', 150)

    const level = store.getSkillLevel('intelligence_analysis')
    expect(level).toBe(2) // 150 exp >= 100 threshold for level 2
  })

  it('should correctly check if skill can be unlocked', () => {
    const store = usePlayerStore.getState()
    // survival has no prerequisite
    expect(store.canUnlockSkill('survival')).toBe(true)

    // political_control needs intelligence_analysis Lv.3
    // If we don't have intelligence_analysis, should be false
    const result = store.canUnlockSkill('political_control')
    expect(result).toBe(false)
  })
})

export type { SkillDefinition, SkillCategory, SkillId }
